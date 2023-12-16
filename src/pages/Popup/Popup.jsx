import React from 'react';
import styled from 'styled-components';
import logo from '../../assets/img/logo.svg';
import Greetings from '../../containers/Greetings/Greetings';
import './Popup.css';

const Button = styled.button`
  background-color: #4CAF50; /* Green */
  border: none;
  color: white;
  padding: 12px 12px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 5px;
`;

async function queryOSPMember() {
  const response = await fetch('/PtaMembership/GetOSPLocalPtaMembers', {
    method: 'POST',
  })
    .then(response => response.json())
    .catch(error => console.error(error));

  return response;
}

async function getCurrentTabId() {
  let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  let currTab = tabs[0];
  return currTab.id;
}

async function loadOSPMember() {
  console.log("loadOSPMember called");

  let currentTabId = await getCurrentTabId();
  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: queryOSPMember,
  })
    .then(injectionResults => {
      for (const { frameId, result } of injectionResults) {
        if (frameId === 0 && result && result.length && result.length > 0) {

        }
      }
    });
}


async function queryMemberPlanetMember() {
  console.log('queryMemberPlanetMember called')
  if (!window.sessionStorage || !window.sessionStorage.appData) {
    return;
  }

  let appDataString = JSON.parse(window.sessionStorage.appData);
  let appData = JSON.parse(appDataString);
  // console.log('parse data called', window.sessionStorage.appData, appData.accessToken);
  if (!appData.accessToken) {
    return;
  }

  function sleepAsync(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  let authHeader = "Bearer " + appData.accessToken;
  let ret = []
  let pageNumIndex = 0;
  while (true) {
    let requestObj = {
      Fields: [],
      OrgLevelMappingIds: [],
      NonStandardFields: [],
      SortField: {
        SortFieldId: "34",
        IsAsc: true,
        IsCustom: false,
        IsEventCustom: false,
        IsEventTicket: false
      },
      KendoSortObject: {
        field: "groupmemberspk",
        dir: "asc"
      },
      PageNo: pageNumIndex,
      PageSize: 100,
      CustomFieldIds: [],
      MatchType: "AND",
      SearchType: "Members",
      IsOrganizationTreeEnabled: false,
      IsMultiRowEnabled: false,
      CanUseSets: false
    }

    const responseObj = await fetch('https://api.memberplanet.com/api/Member/MemberDatabaseSearch', {
      method: 'POST',
      body: JSON.stringify(requestObj),
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      }
    })
      .then(response => response.json())
      .catch(error => console.error(error));
    if (!responseObj || !responseObj.Members) {
      // not getting back correct response
      break;
    }

    for (const member of responseObj.Members) {
      ret.push({
        Firstname: member.firstname,
        Lastname: member.lastname,
        Address: member.streetaddress,
        Email: member.email,
        IsActive: member.IsActive,
        MPIDNumber: member.groupmemberspk,
        Status: 'Unknown',
        MemberLevel: member.LevelName
      });
    }
    // limit to max 100 K members.
    if (ret.length >= responseObj.total || pageNumIndex >= 1000) {
      break;
    }

    await sleepAsync(500);
    pageNumIndex++;
  }
  return ret;
}

async function loadMemberPlanetMember() {
  console.log("loadMemberPlanetMember called");

  let currentTabId = await getCurrentTabId();
  chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: queryMemberPlanetMember,
  })
    .then(injectionResults => {
      for (const { frameId, result } of injectionResults) {
        if (frameId === 0 && result && result.length && result.length > 0) {
          console.log(result);
        }
      }
    });
}

const Popup = () => {
  return (
    <div className="App">
      <header className="App-header">
        <p>
          On OSP Admin Page load members. On MemberPlanet Page load members. Choose rows to upload.
        </p>
      </header>
      <Button onClick={loadOSPMember}>load OSP Members</Button>
      <Button onClick={loadMemberPlanetMember}>load MemberPlanet Members</Button>
    </div>
  );
};

export default Popup;
