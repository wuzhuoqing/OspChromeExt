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

import * as BrExtHelper from './modules/BrExtHelper';
import * as OspHelper from './modules/OspHelper';

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

const Popup = () => {
  const gridStyle = useMemo(() => ({ height: '400px', width: '100%' }), []);
  const autoSizeStrategy = {
    type: 'fitCellContents'
  };
  let ospMemberList = [];
  let mpMemberList = [];

  const [rowDataOsp, setRowDataOsp] = useState(ospMemberList);
  const [columnDefsOsp, setColumnDefsOsp] = useState([
    { field: 'ID', headerCheckboxSelection: true, checkboxSelection: true },
    { field: 'Status' },
    { field: 'Email' },
    { field: 'FirstName' },
    { field: 'LastName' },
    { field: 'IsStudent' },
    { field: 'Address' },
    { field: 'City' },
    { field: 'ZipCode' },
    { field: 'State' },
  ]);
  const getRowIdOsp = useMemo(() => {
    return (params) => params.data.ID;
  }, []);

  const [ospInfoText, setOspInfoText] = useState('This is my first text!');
  const [rowDataMp, setRowDataMp] = useState(mpMemberList);
  const [columnDefsMp, setColumnDefsMp] = useState([
    { field: 'MPID', headerCheckboxSelection: true, checkboxSelection: true },
    { field: 'Status' },
    { field: 'Email' },
    { field: 'FirstName' },
    { field: 'LastName' },
    { field: 'Address' },
  ]);

  const getRowIdMp = useMemo(() => {
    return (params) => params.data.MPID;
  }, []);

  function popupHandleMessages(message) {
    if (message.MemberListUpdated) {
      BrExtHelper.log(message);
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

  const loadOSPMember = OspHelper.oneInstanceRunWrapper(async () => {
    await OspHelper.loadOSPMember();
  });

  const loadMemberPlanetMember = OspHelper.oneInstanceRunWrapper(async () => {
    await OspHelper.loadMemberPlanetMember();
  });

  const syncMember = OspHelper.oneInstanceRunWrapper(async () => {
    await OspHelper.syncMember();
  });

  useEffect(
    initRunFunc, // <- function that will run on every dependency update
    [] // <-- empty dependency array
  );

  return (
    <div className="App">
      <div className="ospinfo-container">
        {ospInfoText}
      </div>
      <div className="mpsync-container">
        <Button onClick={syncMember}>Sync Members</Button>
      </div>
      <div className="mplist-container">
        <div>
          <div>
            <Button onClick={loadOSPMember}>Load OSP Members</Button>
          </div>
          <div style={gridStyle}
            className={
              "ag-theme-quartz"
            }>
            <AgGridReact
              autoSizeStrategy={autoSizeStrategy}
              rowData={rowDataOsp}
              columnDefs={columnDefsOsp}
              rowSelection={'multiple'}
              rowMultiSelectWithClick={true}
              getRowId={getRowIdOsp}
            />
          </div>
        </div>
        <div>
          <div>
            <Button onClick={loadMemberPlanetMember}>Load MP Members</Button>
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
              rowMultiSelectWithClick={true}
              getRowId={getRowIdMp}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Popup;
