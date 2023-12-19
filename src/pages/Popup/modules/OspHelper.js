import * as BrExtHelper from './BrExtHelper';

const MP_memberInformationUrl = 'https://www.memberplanet.com/Members/MemberInformation.aspx';
const MP_quickAddMembersUrl = "https://www.memberplanet.com/Members/QuickAddMembers.aspx";
const MP_memberDetailsUrl = 'https://www.memberplanet.com/Members/MemberDetails.aspx';

async function queryOSPMemberInContent() {
  //console.log('queryOSPMemberInContent called');

  const responseObj = await fetch('/PtaMembership/GetOSPLocalPtaMembers', {
    method: 'POST',
  })
    .then(response => response.json())
    .catch(error => console.error(error));

  let ret = {
    memberList: [],
    statusMsg: 'Fail to load OSP Member'
  };

  if (!responseObj || (!responseObj.length && responseObj.length !== 0)) {
    return ret;
  }

  for (const member of responseObj) {
    ret.memberList.push({
      ID: member.ID,
      FirstName: member.FirstName,
      LastName: member.LastName,
      Address: member.Address,
      City: member.City,
      ZipCode: member.ZipCode,
      State: member.State,
      Email: member.EmailAddress,
      Status: 'Unknown',
      IsStudent: member.IsStudent,
    });
  }

  ret.statusMsg = 'Success';
  return ret;
}

export async function loadOSPMember() {
  BrExtHelper.log("loadOSPMember called");

  let currentTabId = await BrExtHelper.getCurrentTabId();
  let result = await BrExtHelper.executeFuncInContent(currentTabId, queryOSPMemberInContent);
  let statusMsg = '';
  if (result) {
    statusMsg = result.statusMsg;
    if (result.memberList && result.memberList.length > 0) {
      chrome.runtime.sendMessage({
        OSPMemberList: result.memberList
      });
    }
  }
  return statusMsg;
}

async function queryMemberPlanetMemberInContent() {

  function sleepAsync(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // console.log('queryMemberPlanetMemberInContent called')

  let ret = {
    memberList: [],
    statusMsg: 'Fail to load MP Member'
  };

  if (!window.sessionStorage || !window.sessionStorage.appData) {
    return ret;
  }

  let appDataString = JSON.parse(window.sessionStorage.appData);
  let appData = JSON.parse(appDataString);
  // BrExtHelper.log('parse data called', window.sessionStorage.appData, appData.accessToken);
  if (!appData.accessToken) {
    return ret;
  }

  let authHeader = "Bearer " + appData.accessToken;
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

    let errorInFetch = false;
    const responseObj = await fetch('https://api.memberplanet.com/api/Member/MemberDatabaseSearch', {
      method: 'POST',
      body: JSON.stringify(requestObj),
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      }
    })
      .then(response => response.json())
      .catch(error => {
        console.error(error);
        ret.statusMsg = ret.statusMsg + JSON.stringify(err);
        errorInFetch = true;
      });

    if (errorInFetch || !responseObj || !responseObj.Members || (!responseObj.total && responseObj.total !== 0)) {
      // not getting back correct response
      return ret;
    }

    for (const member of responseObj.Members) {
      ret.memberList.push({
        FirstName: member.firstname,
        LastName: member.lastname,
        Address: member.streetaddress,
        Email: member.email,
        IsActive: member.IsActive,
        MPID: member.groupmemberspk,
        Status: 'Unknown',
        MemberLevel: member.LevelName
      });
    }

    // console.log('queryMemberPlanetMemberInContent check next call')
    // limit to max 100 K members.
    if (ret.memberList.length >= responseObj.total || pageNumIndex >= 1000) {
      break;
    }
    // console.log('queryMemberPlanetMemberInContent getting next call')

    await sleepAsync(500);
    pageNumIndex++;
  }

  ret.statusMsg = 'Success';
  return ret;
}

export async function loadMemberPlanetMember() {
  BrExtHelper.log("loadMemberPlanetMember called");

  let currentTabId = await BrExtHelper.getCurrentTabId();
  let result = await BrExtHelper.executeFuncInContent(currentTabId, queryMemberPlanetMemberInContent);
  let statusMsg = '';
  if (result) {
    statusMsg = result.statusMsg;
    if (result.memberList && result.memberList.length > 0) {
      chrome.runtime.sendMessage({
        MemberPlanetMemberList: result.memberList
      });
    }
  }
  return statusMsg;
}

export function strEqualIgnoreCase(str1, str2) {
  return str1.localeCompare(str2, 'en', { sensitivity: 'base' }) === 0;
}

function extractNumberFromString(str) {
  const regex = /(\d+)/g;
  const matches = str.match(regex);
  if (matches) {
    return parseInt(matches[0]);
  }
  return -1;
}

async function findMember(currentTabId, firstName, lastName, email) {
  await BrExtHelper.gotoUrl(currentTabId, MP_memberInformationUrl);

  if (email) {
    await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$txtSearchByEmail']", email);
  } else {
    await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$txtSearchByFirstName']", firstName);
    await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$txtSearchByLastName']", lastName);
  }
  let userStatusOptionSelector = "select[name='ctl00$ContentPlaceHolder$ddlMemberStatus']";
  let userStatusOptionText = await BrExtHelper.getSelectOptionText(currentTabId, userStatusOptionSelector);
  let statusAllText = 'Status: All';
  if (!strEqualIgnoreCase(statusAllText, userStatusOptionText)) {
    await BrExtHelper.ajaxAction(currentTabId, MP_memberInformationUrl, async () => await BrExtHelper.selectOptionByText(currentTabId, userStatusOptionSelector, statusAllText));
  }
  await BrExtHelper.ajaxAction(currentTabId, MP_memberInformationUrl, async () => await BrExtHelper.clickElm(currentTabId, 'a#ctl00_ContentPlaceHolder_lnkSearch', 'MAIN'));

  let recordText = await BrExtHelper.getEleText(currentTabId, '#ctl00_ContentPlaceHolder_gridForms_ctl00_Pager > tbody > tr > td div > ul > li > span');
  return extractNumberFromString(recordText);
}

// dummy email should always be non empty.
async function addNewMember(currentTabId, ospMember) {
  await BrExtHelper.gotoUrl(currentTabId, MP_quickAddMembersUrl);

  let firstName = ospMember.FirstName;
  let lastName = ospMember.LastName;
  let email = ospMember.Email ? ospMember.Email.trim() : '';
  let dummyEmail = `u${ospMember.ID}_${ospMember.IsStudent ? 's' : 'p'}@ewaeh.org`;
  let isStudent = ospMember.IsStudent;
  let streetAddress = ospMember.Address;
  let city = ospMember.City;
  let state = ospMember.State;
  let zip = ospMember.ZipCode;

  await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$gridNewMembers$ctl02$FirstName']", firstName);
  await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$gridNewMembers$ctl02$LastName']", lastName);
  await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$gridNewMembers$ctl02$EmailAddress']", email || dummyEmail);
  await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$gridNewMembers$ctl02$Quantity']", "1");

  await BrExtHelper.ajaxAction(currentTabId, MP_quickAddMembersUrl, async () => await BrExtHelper.clickElm(currentTabId, 'a#ctl00_ContentPlaceHolder_LnkSaveandaAddMore', 'MAIN'));

  let recordsFound = await findMember(currentTabId, firstName, lastName, email || dummyEmail);
  if (recordsFound !== 1) {
    throw new Error(`Could not locate unique record (${recordsFound} found) for ${firstName},${lastName},${email}. ` + (recordsFound > 0 ? "Please completely remove all record for this user on MP site directly and re-upload." : ''));
  }

  // click to go to details page
  await BrExtHelper.pageAction(currentTabId, async () => await BrExtHelper.clickElm(currentTabId, 'a#ctl00_ContentPlaceHolder_gridForms_ctl00_ctl04_lnkMemberDetails', 'MAIN'));
  await setMembershipLevel(currentTabId, 1);
  await setMemberType(currentTabId, isStudent ? 'Student' : 'Parent / Guardian', firstName, lastName);
  await setMemberAddress(currentTabId, streetAddress, city, state, zip);
  if (!email) {
    await clearDummyEmail(currentTabId);
  }
}

// must be at member details page
async function setMembershipLevel(currentTabId, targetIndex) {
  // open level dialog
  await BrExtHelper.ajaxAction(currentTabId, MP_memberDetailsUrl, async () => await BrExtHelper.clickElm(currentTabId, 'a#ctl00_ContentPlaceHolder_lnkMembershipLevelEdit', 'MAIN'));

  // change level index if needed
  let levelOptionSelector = "select[name='ctl00$ContentPlaceHolder$ddlMembershiplevelEdit']";
  let levelIndex = await BrExtHelper.getSelectOptionIndex(currentTabId, levelOptionSelector);
  if (levelIndex !== targetIndex) {
    await BrExtHelper.ajaxAction(currentTabId, MP_memberDetailsUrl, async () => await BrExtHelper.selectOptionIndex(currentTabId, levelOptionSelector, targetIndex));
  }
  // save and back to details page
  await BrExtHelper.ajaxAction(currentTabId, MP_memberDetailsUrl, async () => await BrExtHelper.clickElm(currentTabId, 'a#ctl00_ContentPlaceHolder_lnkMembershiplevelSave', 'MAIN'));
}

// must be at member details page
async function setMemberType(currentTabId, targetType, firstName, lastName) {
  // open info dialog
  await BrExtHelper.ajaxAction(currentTabId, MP_memberDetailsUrl, async () => await BrExtHelper.clickElm(currentTabId, 'a#ctl00_ContentPlaceHolder_lnkMemberinfoEdit', 'MAIN'));

  await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$FirstName']", firstName);
  await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$LastName']", lastName);

  // change type index if needed
  let typeOptionSelector = "select[name='ctl00$ContentPlaceHolder$ddlType']";
  let typeText = await BrExtHelper.getSelectOptionText(currentTabId, typeOptionSelector);
  if (typeText !== targetType) {
    // type change is not an ajax select
    await BrExtHelper.selectOptionByText(currentTabId, typeOptionSelector, targetType);
  }
  // save and back to details page
  await BrExtHelper.ajaxAction(currentTabId, MP_memberDetailsUrl, async () => await BrExtHelper.clickElm(currentTabId, 'a#ctl00_ContentPlaceHolder_lnkSaveBasicInfo', 'MAIN'));
}

// must be at member details page
async function setMemberAddress(currentTabId, address, city, state, zip) {
  // open info dialog
  await BrExtHelper.ajaxAction(currentTabId, MP_memberDetailsUrl, async () => await BrExtHelper.clickElm(currentTabId, 'a#ctl00_ContentPlaceHolder_lnkLocationEdit', 'MAIN'));

  let countryOptionSelector = "select[name='ctl00$ContentPlaceHolder$CountryFk']";
  let countryText = await BrExtHelper.getSelectOptionText(currentTabId, countryOptionSelector);
  let targetCountry = 'United States of America';
  if (!strEqualIgnoreCase(targetCountry, countryText)) {
    await BrExtHelper.ajaxAction(currentTabId, MP_memberDetailsUrl, async () => await BrExtHelper.selectOptionByText(currentTabId, countryOptionSelector, targetCountry));
  }
  let timezoneOptionSelector = "select[name='ctl00$ContentPlaceHolder$TimeZoneFk']";
  // timezone change is not an ajax select so we can always set it.
  await BrExtHelper.selectOptionIndex(currentTabId, timezoneOptionSelector, 1);

  await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$StreetAddress']", address);
  await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$City']", city);
  await BrExtHelper.selectOptionByText(currentTabId, "select[name='ctl00$ContentPlaceHolder$StateFk']", state);
  await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$ZipCode']", zip);

  // save and back to details page
  await BrExtHelper.ajaxAction(currentTabId, MP_memberDetailsUrl, async () => await BrExtHelper.clickElm(currentTabId, 'a#ctl00_ContentPlaceHolder_lnkSaveLocationContactBottom', 'MAIN'));
}

// must be at member details page
async function clearDummyEmail(currentTabId) {
  // open info dialog
  await BrExtHelper.ajaxAction(currentTabId, MP_memberDetailsUrl, async () => await BrExtHelper.clickElm(currentTabId, 'a#ctl00_ContentPlaceHolder_lnkContactEdit', 'MAIN'));

  await BrExtHelper.setElmText(currentTabId, "input[name='ctl00$ContentPlaceHolder$txtPrimaryEmailAddr']", '');
  // save and back to details page
  await BrExtHelper.ajaxAction(currentTabId, MP_memberDetailsUrl, async () => await BrExtHelper.clickElm(currentTabId, 'a#ctl00_ContentPlaceHolder_lnkConSave', 'MAIN'));
}

async function renewMember(currentTabId, ospMember) {
  let recordsFound = await findMember(currentTabId, ospMember.FirstName, ospMember.LastName, ospMember.Email);
  if (recordsFound !== 1) {
    throw new Error(`Could not locate unique record (${recordsFound} found) for ${ospMember.FirstName},${ospMember.LastName},${ospMember.Email}. ` + (recordsFound > 0 ? "Please completely remove all record for this user on MP site directly and re-upload." : ''));
  }

}

export async function syncMember() {
  let currentTabId = await BrExtHelper.getCurrentTabId();

  let ospMember = {
    "Address": "15506 SE Test St",
    "City": "TestC",
    "Email": "",
    "FirstName": "TestM",
    "ID": 35774,
    "IsStudent": false,
    "LastName": "TestN",
    "State": "WA",
    "Status": "Unknown",
    "ZipCode": "98059"
  }

  let mpMember = {
    "Address": "15 Test Ave Suite 202",
    "Email": "wspta@example.com",
    "FirstName": "WSPTA",
    "IsActive": false,
    "LastName": "Support",
    "MPID": 14860048,
    "MemberLevel": "",
    "Status": "Unknown"
  };

  let recordCount = await addNewMember(currentTabId, ospMember);
  // let recordCount = await renewMember(currentTabId, ospMember, mpMember);

  BrExtHelper.log("findMember", recordCount);
}

export function oneInstanceRunWrapper(asyncFunction) {
  let isExecuting = false;

  return async function (...args) {
    if (isExecuting) {
      return;
    }

    isExecuting = true;

    try {
      await asyncFunction(...args);
    } finally {
      isExecuting = false;
    }
  };
}
