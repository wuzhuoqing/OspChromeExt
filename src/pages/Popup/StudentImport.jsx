import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme

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

const StudentImport = () => {
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
  const [rowDataOspCsv, setRowDataOspCSv] = useState([]);
  const [rowDataOsp, setRowDataOsp] = useState([]);
  const [columnDefsOsp, setColumnDefsOsp] = useState([
    { field: 'ID', headerCheckboxSelection: true, checkboxSelection: true },
    { field: "StudentFirstName" },
    { field: "StudentLastName" },
    { field: "StudentGrade" },
    { field: "Parent1FirstName" },
    { field: "Parent1LastName" },
    { field: "Parent1EmailAddress" },
    { field: "Parent1Password" },
    { field: "Parent1Address" },
    { field: "Parent1City" },
    { field: "Parent1State" },
    { field: "Parent1ZipCode" },
    { field: "Parent1HomePhone" },
    { field: "Parent1CellPhone" },
    { field: "Parent2FirstName" },
    { field: "Parent2LastName" },
    { field: "Parent2EmailAddress" },
    { field: "Parent2Password" },
    { field: "Parent2Address" },
    { field: "Parent2City" },
    { field: "Parent2State" },
    { field: "Parent2ZipCode" },
    { field: "Parent2HomePhone" },
    { field: "Parent2CellPhone" },
    { field: "TeacherFirstName" },
    { field: "TeacherLastName" },
    { field: "TeacherEmailAddress" },

  ]);

  function setOspCSV() {
    OspUtil.log('rowDataOspCsv', rowDataOspCsv);
    setRowDataOsp(rowDataOspCsv);
  }

  const getRowIdOsp = useMemo(() => {
    return (params) => params.data.ID;
  }, []);

  const [allowNoParentStudent, setAllowNoParentStudent] = useState(false);
  function handleAllowNoParentStudentChange(e) {
    setAllowNoParentStudent(e.target.checked);
  }

  const [allowEmptyValueOverwrite, setAllowEmptyValueOverwrite] = useState(false);
  function handleAllowEmptyValueOverwrite(e) {
    setAllowEmptyValueOverwrite(e.target.checked);
  }

  const [ospInfoText1, setOspInfoText1] = useState('');
  const [ospInfoText2, setOspInfoText2] = useState('');

  const uploadOSPUser = OspUtil.oneInstanceRunWrapper(async () => {
    setOspInfoText1('uploading to OSP...');
    let selectedRowData = ospGridRef.current.api.getSelectedRows();
    if (selectedRowData.length === 0) {
      selectedRowData = rowDataOsp;
    }

    const uploadResonse = await OspHelper.uploadOSPUser(selectedRowData, allowNoParentStudent, allowEmptyValueOverwrite);
    setOspInfoText1(`uploading to OSP End ${uploadResonse.statusMsg}`);
    setOspInfoText2(`\r\n${uploadResonse.retMsg.join('\r\n')}`);
  });

  return (
    <div className="App">
      <div className="ospinfo-container">
        {ospInfoText1}
        {ospInfoText2}
      </div>
      <div className="mplist-container">
        <div>
          <div>
            <input value={allowNoParentStudent} type="checkbox" onChange={handleAllowNoParentStudentChange} />AllowNoParentStudentChange
            <input value={allowEmptyValueOverwrite} type="checkbox" onChange={handleAllowEmptyValueOverwrite} />AllowEmptyValueOverwrite
            <LoadGridButton onClick={uploadOSPUser}>Upload To OSP</LoadGridButton>
            <div id='OspCsvImport'>
              <Importer
                dataHandler={async (rows, { startIndex }) => {
                  OspUtil.log('OspCsvImport', rows, startIndex);
                  const rowsWithId = [];
                  for (const [index, row] of rows.entries()) {
                    rowsWithId.push({ ...row, ID: startIndex + index + 1 })
                  }
                  setRowDataOspCSv(oldArray => [...oldArray, ...rowsWithId])
                }}

                onClose={setOspCSV}
              >
                <ImporterField name="StudentFirstName" label="Student first name" optional />
                <ImporterField name="StudentLastName" label="Student last name" optional />
                <ImporterField name="StudentGrade" label="Student grade" optional />
                <ImporterField name="Parent1FirstName" label="Parent 1 first name" optional />
                <ImporterField name="Parent1LastName" label="Parent 1 last name" optional />
                <ImporterField name="Parent1EmailAddress" label="Parent 1 email address" optional />
                <ImporterField name="Parent1Password" label="Parent 1 password" optional />
                <ImporterField name="Parent1Address" label="Parent 1 address" optional />
                <ImporterField name="Parent1City" label="Parent 1 city" optional />
                <ImporterField name="Parent1State" label="Parent 1 state" optional />
                <ImporterField name="Parent1ZipCode" label="Parent 1 zip code" optional />
                <ImporterField name="Parent1HomePhone" label="Parent 1 home phone" optional />
                <ImporterField name="Parent1CellPhone" label="Parent 1 cell phone" optional />
                <ImporterField name="Parent2FirstName" label="Parent 2 first name" optional />
                <ImporterField name="Parent2LastName" label="Parent 2 last name" optional />
                <ImporterField name="Parent2EmailAddress" label="Parent 2 email address" optional />
                <ImporterField name="Parent2Password" label="Parent 2 password" optional />
                <ImporterField name="Parent2Address" label="Parent 2 address" optional />
                <ImporterField name="Parent2City" label="Parent 2 city" optional />
                <ImporterField name="Parent2State" label="Parent 2 state" optional />
                <ImporterField name="Parent2ZipCode" label="Parent 2 zip code" optional />
                <ImporterField name="Parent2HomePhone" label="Parent 2 home phone" optional />
                <ImporterField name="Parent2CellPhone" label="Parent 2 cell phone" optional />
                <ImporterField name="TeacherFirstName" label="Teacher first name" optional />
                <ImporterField name="TeacherLastName" label="Teacher last name" optional />
                <ImporterField name="TeacherEmailAddress" label="Teacher email address" optional />
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
      </div>
    </div>
  );
};

export default StudentImport;
