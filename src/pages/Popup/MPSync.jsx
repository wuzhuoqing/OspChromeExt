import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme

import { useCSVDownloader } from 'react-papaparse';

import { Importer, ImporterField } from 'react-csv-importer';
// include the widget CSS file whichever way your bundler supports it
import 'react-csv-importer/dist/index.css';

import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  StrictMode,
} from 'react';

import styled from 'styled-components';
import logo from '../../assets/img/logo.svg';
import Greetings from '../../containers/Greetings/Greetings';
import './Popup.css';

import BrExtHelper from './modules/BrExtHelper';
import * as OspHelper from './modules/OspHelper';
import * as MemberHelper from './modules/MemberHelper';
import * as OspUtil from './modules/OspUtil';
import statusCellRenderer from './statusCellRenderer';

const Button = styled.button`
  background-color: #4CAF50; /* Green */
  border: none;
  color: white;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 5px;
`;

const LoadGridButton = styled.button`
  background-color: #299dbd;
  border: none;
  color: white;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 5px;
`;

const Popup = () => {
  const gridStyle = useMemo(() => ({ height: '400px', width: '100%' }), []);
  // const gridStatusBar = useMemo(() => {
  //   return {
  //     statusPanels: [
  //       { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left', },
  //       { statusPanel: 'agTotalRowCountComponent', align: 'center' },
  //       { statusPanel: 'agFilteredRowCountComponent' },
  //       { statusPanel: 'agSelectedRowCountComponent' },
  //       { statusPanel: 'agAggregationComponent' },
  //     ]
  //   };
  // }, []);

  const autoSizeStrategy = {
    type: 'fitCellContents'
  };

  const { CSVDownloader } = useCSVDownloader();

  const ospGridRef = useRef();
  const mpGridRef = useRef();
  const [rowDataOspCsv, setRowDataOspCSv] = useState([]);
  const [rowDataMpCsv, setRowDataMpCSv] = useState([]);

  const [rowDataOsp, setRowDataOsp] = useState([]);
  const [columnDefsOsp, setColumnDefsOsp] = useState([
    { field: 'ID', headerCheckboxSelection: true, checkboxSelection: true },
    { field: 'Status', cellRenderer: statusCellRenderer },
    { field: 'Email', filter: true },
    //{ field: 'MPIDString', headerName: 'MPID' },
    { field: 'FirstName', filter: true },
    { field: 'LastName', filter: true },
    { field: 'IsStudent', filter: true },
    { field: 'Address', filter: true },
    //{ field: 'City', filter: true },
    //{ field: 'ZipCode', filter: true },
    //{ field: 'State' },
  ]);
  const getRowIdOsp = useMemo(() => {
    return (params) => params.data.ID;
  }, []);

  const [waitEleDelay, setWaitEleDelay] = useState(0);

  const [ospInfoWarning1, setOspInfoWarning1] = useState('');
  const [ospInfoWarning2, setOspInfoWarning2] = useState('');

  const [ospInfoText1, setOspInfoText1] = useState('');
  const [ospInfoText2, setOspInfoText2] = useState('');
  const [ospMemberLastUpdateInfo, setOspMemberLastUpdateInfo] = useState('');
  const [mpMemberLastUpdateInfo, setMpMemberLastUpdateInfo] = useState('');

  const [rowDataMp, setRowDataMp] = useState([]);
  const [columnDefsMp, setColumnDefsMp] = useState([
    { field: 'ID', headerCheckboxSelection: true, checkboxSelection: true },
    { field: 'Status', cellRenderer: statusCellRenderer },
    { field: 'Email', filter: true },
    { field: 'FirstName', filter: true },
    { field: 'LastName', filter: true },
    { field: 'MemberType', filter: true },
    //{ field: 'IsActive' },
    //{ field: 'MemberLevel' },
  ]);

  const getRowIdMp = useMemo(() => {
    return (params) => params.data.ID;
  }, []);

  function popupHandleMessages(message) {
    if (message.MemberListUpdated) {
      OspUtil.log('popup got data refreshed', message);
      let ospMemberList = message.ospMemberList.memberList;
      let mpMemberList = message.mpMemberList.memberList;
      MemberHelper.cleanAndMatchOspMpMembers(ospMemberList, mpMemberList);
      // don't show inactive MP members which is not going to be renewed. Can have a lot.
      mpMemberList = mpMemberList.filter(m => m.IsActive || m.Status !== MemberHelper.MPSyncStatus.Extra);
      const ospMemberToUpload = MemberHelper.getOspMemberToUpload(ospMemberList);
      const ospWarningMsg = MemberHelper.getExtraMemberWarningMsg(ospMemberList);
      const mpWarningMsg = MemberHelper.getExtraMemberWarningMsg(mpMemberList);

      setOspInfoText1(`${ospMemberToUpload.length} OSP member to be uploaded`)

      if (message.ospMemberList.lastUpdate > 0) {
        setOspMemberLastUpdateInfo(`lastUpdate ${(new Date(message.ospMemberList.lastUpdate)).toLocaleString()}`)
      }

      if (message.mpMemberList.lastUpdate > 0) {
        setMpMemberLastUpdateInfo(`lastUpdate ${(new Date(message.mpMemberList.lastUpdate)).toLocaleString()}`)
      }

      if (ospWarningMsg || mpWarningMsg) {
        const ospInfo = 'Find duplicate members in OSP, please sort by Status column to check and take actions directly on  if needed.';
        const mpInfo = 'Find duplicate/extra members in MemberPlanet, please sort by Status column to check and take actions directly on MemberPlanet if needed.';
        setOspInfoWarning2(`${ospWarningMsg ? ospInfo : ''} ${mpWarningMsg ? mpInfo : ''}`);
        setOspInfoText2(`${ospWarningMsg ? 'OSP Details:' : ''} ${ospWarningMsg} ${mpWarningMsg ? 'MP Details:' : ''} ${mpWarningMsg}`);
      }

      setRowDataMp(mpMemberList);
      setRowDataOsp(ospMemberList);
    }
  }

  function saveOspCSV() {
    OspUtil.log('rowDataOspCsv', rowDataOspCsv);
    const rowsPatched = [];
    for (const [index, row] of rowDataOspCsv.entries()) {
      rowsPatched.push({ ...row, IsStudent: OspUtil.strEqualIgnoreCase('Student', row.MemberType) })
    }

    document.getElementById('OspCsvImportCheckbox').checked = false;
    document.querySelector('div#OspCsvImport').style.display = 'none';
    chrome.runtime.sendMessage({
      OSPMemberList: {
        lastUpdate: Date.now(),
        memberList: rowsPatched
      }
    });
  }

  function saveMpCSV() {
    OspUtil.log('rowDataMpCsv', rowDataMpCsv);
    const rowsPatched = [];
    for (const [index, row] of rowDataMpCsv.entries()) {
      // GiveBack voided member doesn't count
      if (!OspUtil.strEqualIgnoreCase(row.MemberStatus, 'Voided')) {
        rowsPatched.push(MemberHelper.patchMpMember(row));
      }
    }
    document.getElementById('MpCsvImportCheckbox').checked = false;
    document.querySelector('div#MpCsvImport').style.display = 'none';
    chrome.runtime.sendMessage({
      MPMemberList: {
        lastUpdate: Date.now(),
        memberList: rowsPatched
      }
    });
  }

  function initRunFunc() {
    requestMemberListFromBackgroud();
    //document.querySelector('div#batchVoidGiveBackDiv').style.display = 'none';
    chrome.runtime.onMessage.addListener(popupHandleMessages);
  }

  function requestMemberListFromBackgroud() {
    chrome.runtime.sendMessage({
      RequestMemberList: true
    });
  }

  const loadOSPMember = OspUtil.oneInstanceRunWrapper(async () => {
    setOspInfoText1('loading OSPMember...');
    const statusMsg = await OspHelper.loadOSPMember();
    setOspInfoText1(`load OSPMember End. ${statusMsg}`);
  });

  const loadGiveBacksMember = OspUtil.oneInstanceRunWrapper(async () => {
    const currentTabUrl = await BrExtHelper.getCurrentTabUrl();
    const currentTabHost = OspUtil.getHost(currentTabUrl);
    if (!currentTabHost.toLowerCase().endsWith(OspHelper.GB_HostSuffix)) {
      setOspInfoWarning1(`not on ${OspHelper.GB_HostSuffix}`);
      setOspInfoText1(`tabUrl is "${currentTabUrl}"`);
      return;
    }

    setOspInfoText1('loading GiveBacks Member...');
    const statusMsg = await OspHelper.loadGiveBacksMember();
    if (statusMsg === 'Success') {
      document.querySelector('div#batchVoidGiveBackDiv').style.display = 'block';
    } else {
      document.querySelector('div#batchVoidGiveBackDiv').style.display = 'none';
    }
    setOspInfoText1(`load GiveBacks Member End. ${statusMsg}`);
  });

  const loadMemberPlanetMember = OspUtil.oneInstanceRunWrapper(async () => {
    let currentTabUrl = await BrExtHelper.getCurrentTabUrl();
    if (!currentTabUrl.toLowerCase().startsWith(OspHelper.MP_AppBaseUrl)) {
      setOspInfoWarning1(`not on ${OspHelper.MP_AppBaseUrl}`);
      setOspInfoText1(`tabUrl is "${currentTabUrl}"`);
      return;
    }

    setOspInfoText1('loading MemberPlanet Member...');
    const statusMsg = await OspHelper.loadMemberPlanetMember();
    setOspInfoText1(`load MemberPlanet Member End. ${statusMsg}`);
  });

  const updateOSPMemberMPID = OspUtil.oneInstanceRunWrapper(async () => {
    setOspInfoText1('updating OSPMember MPIDs...');
    let selectedRowData = ospGridRef.current.api.getSelectedRows();
    if (selectedRowData.length === 0) {
      selectedRowData = rowDataOsp;
    }
    const statusMsg = await OspHelper.updateOSPMemberMPID(selectedRowData);
    setOspInfoText1(statusMsg);
  });

  function getGiveBacksMemberUploadCsv() {
    OspUtil.log('getGiveBacksMemberUploadCsv called');
    let selectedRowData = ospGridRef.current.api.getSelectedRows();
    if (selectedRowData.length === 0) {
      selectedRowData = rowDataOsp;
    }
    const ospMemberToUpload = MemberHelper.getOspMemberToUpload(selectedRowData);
    OspUtil.log('ospMemberToCsv', ospMemberToUpload);
    const gbCsvObjs = [];
    const gbSchoolYear = OspUtil.getCurrentGiveBacksShoolYear();
    for (const member of ospMemberToUpload) {
      gbCsvObjs.push({
        "First Name": member.FirstName,
        "Last Name": member.LastName,
        "Email": member.Email,
        "Phone Number": '',
        "Member Type": member.IsStudent ? 'Student' : 'Parent/Guardian',
        "School Year Ending": gbSchoolYear
      })
    }
    return gbCsvObjs;
  }

  const syncGiveBacksMember = OspUtil.oneInstanceRunWrapper(async () => {
    OspUtil.log('syncGiveBacksMember called');
    let currentTabUrl = await BrExtHelper.getCurrentTabUrl();
    const currentTabHost = OspUtil.getHost(currentTabUrl);
    if (!currentTabHost.toLowerCase().endsWith(OspHelper.GB_HostSuffix)) {
      setOspInfoWarning1(`not on ${OspHelper.GB_HostSuffix}`);
      setOspInfoText1(`tabUrl is "${currentTabUrl}"`);
      return;
    }

    setOspInfoWarning1('');
    setOspInfoWarning2('');
    setOspInfoText1('');
    setOspInfoText2('');
    let selectedRowData = ospGridRef.current.api.getSelectedRows();
    if (selectedRowData.length === 0) {
      selectedRowData = rowDataOsp;
    }
    const ospMemberToUpload = MemberHelper.getOspMemberToUpload(selectedRowData);
    OspUtil.log('ospMemberToSync', ospMemberToUpload);

    let gridContainer = document.querySelector('div.mplist-container');
    gridContainer.style.display = 'none';

    let processMsg = await OspHelper.syncGiveBacksMember(currentTabHost, ospMemberToUpload, OspUtil.extractFloat(waitEleDelay) * 1000, setOspInfoText2, setOspInfoWarning2);
    setOspInfoWarning2(processMsg);
    setOspInfoWarning1(`Sync operation done. GiveBacks member status may be changed now. Please go to GiveBacks member page and reload member list to refresh status`);
    gridContainer.style.display = 'block';
  });

  const voidGiveBacksMember = OspUtil.oneInstanceRunWrapper(async () => {
    OspUtil.log('voidGiveBacksMember called');
    let currentTabUrl = await BrExtHelper.getCurrentTabUrl();
    const currentTabHost = OspUtil.getHost(currentTabUrl);
    if (!currentTabHost.toLowerCase().endsWith(OspHelper.GB_HostSuffix)) {
      setOspInfoWarning1(`not on ${OspHelper.GB_HostSuffix}`);
      setOspInfoText1(`tabUrl is "${currentTabUrl}"`);
      return;
    }

    setOspInfoWarning1('');
    setOspInfoWarning2('');
    setOspInfoText1('');
    setOspInfoText2('');

    const selectedRowData = mpGridRef.current.api.getSelectedRows();
    OspUtil.log('gbMemberToVoid', selectedRowData);

    let gridContainer = document.querySelector('div.mplist-container');
    gridContainer.style.display = 'none';

    let processMsg = await OspHelper.batchVoidGiveBacksMember(selectedRowData, 100, setOspInfoText2, setOspInfoWarning2);

    gridContainer.style.display = 'block';

    setOspInfoWarning2(processMsg);
    setOspInfoWarning1(`Void operation done. GiveBacks member status may be changed now. Please go to GiveBacks member page and reload member list to refresh status`);
  });

  const syncMemberPlanetMember = OspUtil.oneInstanceRunWrapper(async () => {
    OspUtil.log('syncMemberPlanetMember called');
    let currentTabUrl = await BrExtHelper.getCurrentTabUrl();
    if (!currentTabUrl.toLowerCase().startsWith(OspHelper.MP_BaseUrl)) {
      setOspInfoWarning1(`not on ${OspHelper.MP_BaseUrl}`);
      setOspInfoText1(`tabUrl is "${currentTabUrl}"`);
      return;
    }

    setOspInfoWarning1('');
    setOspInfoWarning2('');
    setOspInfoText1('');
    setOspInfoText2('');
    const selectedRowData = ospGridRef.current.api.getSelectedRows();
    const ospMemberToUpload = MemberHelper.getOspMemberToUpload(selectedRowData);
    OspUtil.log('ospMemberToUpload', ospMemberToUpload);

    let gridContainer = document.querySelector('div.mplist-container');
    gridContainer.style.display = 'none';

    let processMsg = await OspHelper.syncMemberPlanetMember(ospMemberToUpload, OspUtil.extractFloat(waitEleDelay) * 1000, setOspInfoText2, setOspInfoWarning2);
    setOspInfoWarning2(processMsg);
    setOspInfoWarning1(`MP member status may be changed now. Please go to memberplanet member page and reload member list to refresh status`);
    gridContainer.style.display = 'block';
  });

  useEffect(
    initRunFunc, // <- function that will run on every dependency update
    [] // <-- empty dependency array
  );

  return (
    <div className="App">
      <div className="ospinfo-container">
        <h5>{ospInfoWarning1}</h5>
        {ospInfoText1}
        <h5>{ospInfoWarning2}</h5>
        {ospInfoText2}
      </div>
      <div className="mpsync-container">
        <CSVDownloader
          type={'button'}
          filename={'OspToGiveBackUpload'}
          bom={true}
          config={{
            delimiter: ',',
          }}
          data={getGiveBacksMemberUploadCsv}
        >Download GiveBacks UploadCsv</CSVDownloader>
        Execute Delay<input value={waitEleDelay} onChange={e => setWaitEleDelay(e.target.value)} />Second
        <Button onClick={syncGiveBacksMember}>Sync Members</Button>
      </div>
      <div className="mplist-container">
        <div>
          <div>
            <LoadGridButton onClick={loadOSPMember}>Load OSP Members</LoadGridButton>
            <span>{ospMemberLastUpdateInfo}</span>
            <input id='OspCsvImportCheckbox' type='checkbox' value={false} onChange={e => document.querySelector('div#OspCsvImport').style.display = document.querySelector('div#OspCsvImport').style.display === 'block' ? 'none' : 'block'} />UseCsv
            <div id='OspCsvImport' style={{ display: "none" }}>
              <Importer
                dataHandler={async (rows, { startIndex }) => {
                  OspUtil.log('OspCsvImport', rows, startIndex);
                  const rowsWithId = [];
                  for (const [index, row] of rows.entries()) {
                    rowsWithId.push({ ...row, ID: startIndex + index + 1 })
                  }
                  setRowDataOspCSv(oldArray => [...oldArray, ...rowsWithId])
                }}
                onClose={saveOspCSV}
              >
                <ImporterField name="Email" label="Email" />
                <ImporterField name="FirstName" label="First Name" />
                <ImporterField name="LastName" label="Last Name" />
                <ImporterField name="MemberType" label="Member Type" />
              </Importer>
            </div>
          </div>
          <div style={gridStyle}
            className={
              "ag-theme-quartz"
            }>
            <AgGridReact
              ref={ospGridRef}
              autoSizeStrategy={autoSizeStrategy}
              rowData={rowDataOsp}
              columnDefs={columnDefsOsp}
              rowSelection={'multiple'}
              pagination={true}
              rowMultiSelectWithClick={true}
              enableCellTextSelection={true}
              ensureDomOrder={true}
              getRowId={getRowIdOsp}
            // statusBar={gridStatusBar}
            />
          </div>
        </div>
        <div>
          <div id='batchVoidGiveBackDiv'><Button onClick={voidGiveBacksMember}>Batch Void Members</Button></div>
          <div>
            <LoadGridButton onClick={loadGiveBacksMember}>Load GiveBacks Members</LoadGridButton>
            <span>{mpMemberLastUpdateInfo}</span>
            <input id='MpCsvImportCheckbox' type='checkbox' value={false} onChange={e => document.querySelector('div#MpCsvImport').style.display = document.querySelector('div#MpCsvImport').style.display === 'block' ? 'none' : 'block'} />UseCsv
            <div id='MpCsvImport' style={{ display: "none" }}>
              <Importer
                dataHandler={async (rows, { startIndex }) => {
                  OspUtil.log('MpCsvImport', rows, startIndex);
                  const rowsWithId = [];
                  for (const [index, row] of rows.entries()) {
                    rowsWithId.push({ ...row, ID: startIndex + index + 1 })
                  }
                  setRowDataMpCSv(oldArray => [...oldArray, ...rowsWithId])
                }}
                onClose={saveMpCSV}
              >
                <ImporterField name="Email" label="Email" />
                <ImporterField name="FirstName" label="First Name" />
                <ImporterField name="LastName" label="Last Name" />
                <ImporterField name="MemberType" label="Member Type" />
                <ImporterField name="MemberStatus" label="Status" />
              </Importer>
            </div>
          </div>
          <div style={gridStyle}
            className={
              "ag-theme-quartz"
            }>
            <AgGridReact
              ref={mpGridRef}
              autoSizeStrategy={autoSizeStrategy}
              rowData={rowDataMp}
              columnDefs={columnDefsMp}
              rowSelection={'multiple'}
              pagination={true}
              rowMultiSelectWithClick={true}
              enableCellTextSelection={true}
              ensureDomOrder={true}
              getRowId={getRowIdMp}
            // statusBar={gridStatusBar}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Popup;
