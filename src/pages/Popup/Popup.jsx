import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme

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

  const ospGridRef = useRef();
  const [rowDataOsp, setRowDataOsp] = useState([]);
  const [columnDefsOsp, setColumnDefsOsp] = useState([
    { field: 'ID', headerCheckboxSelection: true, checkboxSelection: true },
    { field: 'Status', cellRenderer: statusCellRenderer },
    { field: 'Email', filter: true },
    { field: 'MPIDString', headerName: 'MPID' },
    { field: 'FirstName', filter: true },
    { field: 'LastName', filter: true },
    { field: 'IsStudent', filter: true },
    { field: 'Address', filter: true },
    { field: 'City', filter: true },
    { field: 'ZipCode', filter: true },
    { field: 'State' },
  ]);
  const getRowIdOsp = useMemo(() => {
    return (params) => params.data.ID;
  }, []);

  const [waitEleDelay, setWaitEleDelay] = useState(0);

  const [ospInfoWarning1, setOspInfoWarning1] = useState('');
  const [ospInfoWarning2, setOspInfoWarning2] = useState('');

  const [ospInfoText1, setOspInfoText1] = useState('');
  const [ospInfoText2, setOspInfoText2] = useState('');
  const [rowDataMp, setRowDataMp] = useState([]);
  const [columnDefsMp, setColumnDefsMp] = useState([
    { field: 'MPID', headerCheckboxSelection: true, checkboxSelection: true },
    { field: 'Status', cellRenderer: statusCellRenderer },
    { field: 'Email', filter: true },
    { field: 'FirstName', filter: true },
    { field: 'LastName', filter: true },
    { field: 'Address', filter: true },
    { field: 'IsActive' },
    { field: 'MemberLevel' },
  ]);

  const getRowIdMp = useMemo(() => {
    return (params) => params.data.MPID;
  }, []);

  function popupHandleMessages(message) {
    if (message.MemberListUpdated) {
      OspUtil.log('popup got data refreshed', message);
      MemberHelper.cleanAndMatchOspMpMembers(message.ospMemberList, message.mpMemberList);
      // don't show inactive MP members which is not going to be renewed. Can have a lot.
      message.mpMemberList = message.mpMemberList.filter(m => m.IsActive || m.Status !== MemberHelper.MPSyncStatus.Extra);
      const ospMemberToUpload = MemberHelper.getOspMemberToUpload(message.ospMemberList);
      const ospWarningMsg = MemberHelper.getExtraMemberWarningMsg(message.ospMemberList);
      const mpWarningMsg = MemberHelper.getExtraMemberWarningMsg(message.mpMemberList);

      setOspInfoText1(`${ospMemberToUpload.length} OSP member to be uploaded`)

      if (ospWarningMsg || mpWarningMsg) {
        const ospInfo = 'Find duplicate members in OSP, please sort by Status column to check and take actions directly on  if needed.';
        const mpInfo = 'Find duplicate/extra members in MemberPlanet, please sort by Status column to check and take actions directly on MemberPlanet if needed.';
        setOspInfoWarning2(`${ospWarningMsg ? ospInfo : ''} ${mpWarningMsg ? mpInfo : ''}`);
        setOspInfoText2(`${ospWarningMsg ? 'OSP Details:' : ''} ${ospWarningMsg} ${mpWarningMsg ? 'MP Details:' : ''} ${mpWarningMsg}`);
      }

      setRowDataMp(message.mpMemberList);
      setRowDataOsp(message.ospMemberList);
    }
  }

  function initRunFunc() {
    requestMemberListFromBackgroud();
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
    const selectedRowData = ospGridRef.current.api.getSelectedRows();
    const statusMsg = await OspHelper.updateOSPMemberMPID(selectedRowData);
    setOspInfoText1(statusMsg);
  });

  const syncMember = OspUtil.oneInstanceRunWrapper(async () => {
    OspUtil.log('syncMember called');
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

    let processMsg = await OspHelper.syncMember(ospMemberToUpload, OspUtil.extractFloat(waitEleDelay) * 1000, setOspInfoText2, setOspInfoWarning2);
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
        Execute Delay<input value={waitEleDelay} onChange={e => setWaitEleDelay(e.target.value)} />Second
        <Button onClick={syncMember}>Sync Members</Button>
        <Button onClick={updateOSPMemberMPID}>Update OSP MPIDs</Button>
      </div>
      <div className="mplist-container">
        <div>
          <div>
            <LoadGridButton onClick={loadOSPMember}>Load OSP Members</LoadGridButton>
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
          <div>
            <LoadGridButton onClick={loadMemberPlanetMember}>Load MP Members</LoadGridButton>
          </div>
          <div style={gridStyle}
            className={
              "ag-theme-quartz"
            }>
            <AgGridReact
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
