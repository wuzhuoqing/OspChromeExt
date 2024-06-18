import BrExtHelper from './BrExtHelper';
import * as MemberHelper from './MemberHelper';
import * as OspUtil from './OspUtil';

export const MP_BaseUrl = 'https://www.memberplanet.com/';
export const MP_AppBaseUrl = 'https://app.memberplanet.com/';
export const MP_memberInformationUrl = 'https://www.memberplanet.com/Members/MemberInformation.aspx';
export const MP_quickAddMembersUrl = "https://www.memberplanet.com/Members/QuickAddMembers.aspx";
export const MP_memberDetailsUrl = 'https://www.memberplanet.com/Members/MemberDetails.aspx';
export const MP_APISearchUrl = 'https://api.memberplanet.com/api/Member/MemberDatabaseSearch';

export const GB_HostSuffix = '.givebacks.com';

async function queryOSPMemberInContent() {
  console.log('queryOSPMemberInContent called');

  let errorMsg = '';
  const responseObj = await fetch('/PtaMembership/GetOSPLocalPtaMembers', {
    method: 'POST',
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Fail to query OSPMembers. Wrong website? HTTP status ${response.status}  ${response.statusText}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error(error);
      errorMsg = `${error}`;
    });

  let ret = {
    memberList: [],
    statusMsg: `Fail to load OSP Member ${errorMsg}`
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
      MPIDString: member.MPIDNumber,
      Status: 'Unknown',
      dbID: member.dbID,
      IsStudent: member.IsStudent,
    });
  }

  ret.statusMsg = 'Success';
  return ret;
}

export async function loadOSPMember() {
  OspUtil.log("loadOSPMember called");

  const currentTabId = await BrExtHelper.getCurrentTabId();
  const browserExtHelper = new BrExtHelper(currentTabId);
  const result = await browserExtHelper.executeFuncInContent(queryOSPMemberInContent);
  let statusMsg = '';
  if (result) {
    statusMsg = result.statusMsg;
    if (result.memberList && result.memberList.length > 0) {
      const rowsPatched = [];
      for (const [index, row] of result.memberList.entries()) {
        // we only ask for active GiveBackmembers
        rowsPatched.push(MemberHelper.patchOspMember(row));
      }
      chrome.runtime.sendMessage({
        OSPMemberList: {
          lastUpdate: Date.now(),
          memberList: rowsPatched
        }
      });
    }
  }
  return statusMsg;
}

async function getTeacherClassroomInfoListInContent() {
  console.log('getTeacherClassroomInfoListInContent called');

  let errorMsg = '';
  const responseObj = await fetch('/DataImport/GetTeacherClassroomInfoList', {
    method: 'POST',
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Fail to GetTeacherClassroomInfoList. Wrong website? HTTP status ${response.status}  ${response.statusText}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error(error);
      errorMsg = `${error}`;
    });

  let ret = {
    teacherClassRoomInfoList: [],
    statusMsg: `Fail to load OSP Member ${errorMsg}`
  };

  if (!responseObj || (!responseObj.length && responseObj.length !== 0)) {
    return ret;
  }

  for (const member of responseObj) {
    ret.teacherClassRoomInfoList.push(member);
  }

  ret.statusMsg = 'Success';
  return ret;
}

export async function getTeacherClassroomInfoList() {
  OspUtil.log("getTeacherClassroomInfoList called");

  const currentTabId = await BrExtHelper.getCurrentTabId();
  const browserExtHelper = new BrExtHelper(currentTabId);
  const result = await browserExtHelper.executeFuncInContent(getTeacherClassroomInfoListInContent);
  return result;
}

async function AddStudentAndTwoParentsInContent(ospFamilyInfoList) {
  console.log('AddStudentAndTwoParentsInContent called');

  const ret = {
    responseList: [],
    statusMsg: `Fail to AddStudentAndTwoParentsInContent`
  };

  for (const ospFamilyInfo of ospFamilyInfoList) {
    let errorMsg = '';
    const responseObj = await fetch('/DataImport/AddStudentAndTwoParents', {
      method: 'POST',
      body: JSON.stringify(ospFamilyInfo),
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Fail to AddStudentAndTwoParents, Wrong website?. HTTP status ${response.status}  ${response.statusText}`);
        }
        return response.json();
      })
      .catch(error => {
        console.error(error)
        errorMsg = `${error}`;
        ret.responseList.push(errorMsg);
      });

    if (!responseObj || (!responseObj.length && responseObj.length !== 0)) {
      return ret;
    }
    ret.responseList.push(responseObj.join(' '));
  }

  ret.statusMsg = `Success`;
  return ret;
}

export async function AddStudentAndTwoParents(ospFamilyInfoList) {
  OspUtil.log("AddStudentAndTwoParents called");

  const currentTabId = await BrExtHelper.getCurrentTabId();
  const browserExtHelper = new BrExtHelper(currentTabId);
  const result = await browserExtHelper.executeFuncInContent(AddStudentAndTwoParentsInContent, [ospFamilyInfoList]);
  return result;
}

async function queryMemberPlanetMemberInContent() {

  function sleepAsync(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  console.log('queryMemberPlanetMemberInContent called')

  let ret = {
    memberList: [],
    statusMsg: 'Fail to load MP Member'
  };

  if (!window.sessionStorage || !window.sessionStorage.appData) {
    return ret;
  }

  let appDataString = JSON.parse(window.sessionStorage.appData);
  let appData = JSON.parse(appDataString);
  if (!appData.accessToken) {
    return ret;
  }

  console.log('queryMemberPlanetMemberInContent appData.accessToken found');

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
    // cannot use MP_APISearchUrl here as it is passed to another page
    const responseObj = await fetch('https://api.memberplanet.com/api/Member/MemberDatabaseSearch', {
      method: 'POST',
      body: JSON.stringify(requestObj),
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Fail to query MemberPlanet. Wrong website?  HTTP status ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .catch(error => {
        console.error(error);
        ret.statusMsg = ret.statusMsg + `${err}`;
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

    // limit to max 100 K members.
    if (ret.memberList.length >= responseObj.total || pageNumIndex >= 1000) {
      break;
    }
    console.log('queryMemberPlanetMemberInContent prepare next call. current pageNumIndex', pageNumIndex)

    await sleepAsync(50);
    pageNumIndex++;
  }

  console.log('end of queryMemberPlanetMemberInContent');
  ret.statusMsg = 'Success';
  return ret;
}

export async function loadMemberPlanetMember() {
  OspUtil.log("loadMemberPlanetMember called");

  const currentTabId = await BrExtHelper.getCurrentTabId();
  const browserExtHelper = new BrExtHelper(currentTabId);
  const result = await browserExtHelper.executeFuncInContent(queryMemberPlanetMemberInContent);
  let statusMsg = '';
  if (result) {
    statusMsg = result.statusMsg;
    if (result.memberList && result.memberList.length > 0) {
      const rowsPatched = [];
      for (const [index, row] of result.memberList.entries()) {
        // we only ask for active GiveBackmembers
        //rowsPatched.push(MemberHelper.patchMpMember(row));
        rowsPatched.push(row);
      }
      chrome.runtime.sendMessage({
        MPMemberList: {
          lastUpdate: Date.now(),
          memberList: rowsPatched
        }
      });
    }
  }
  return statusMsg;
}

async function queryGiveBacksHubTokenInfoInContent() {

  console.log('queryGiveBacksHubTokenInfoInContent called')

  let ret = {
    appToken: '',
    appSecret: '',
    memberHubId: '',
    hostPrefix: '',
    statusMsg: 'Fail to get memberHubId'
  };

  if (!window.localStorage || !window.localStorage.gb_session || !window.location.host) {
    return ret;
  }

  const appData = JSON.parse(window.localStorage.gb_session);
  if (!appData.token || !appData.secret) {
    return ret;
  }

  const hostPrefix = window.location.host.split('.')[0];

  console.log('queryGiveBacksHubTokenInfoInContent appData.accessToken found', hostPrefix);
  let errorInFetchOrgId = false;
  // cannot use MP_APISearchUrl here as it is passed to another page
  const orgIdResponseObj = await fetch('https://api.givebacks.com/services/core/causes/' + hostPrefix, {
    method: 'GET',
    //body: JSON.stringify(requestObj),
    headers: {
      //'Content-Type': 'application/json',
      'Authentication-Session-Token': appData.token,
      'Authentication-Session-Secret': appData.secret
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Fail to query GiveBacks. Wrong website?  HTTP status ${response.status} ${response.statusText}`);
      }
      //console.log('queryGiveBacksHubTokenInfoInContent query cause', response.status, response.statusText);
      return response.json();
    })
    .catch(error => {
      console.error(error);
      ret.statusMsg = ret.statusMsg + `${err}`;
      errorInFetchOrgId = true;
    });

  if (errorInFetchOrgId || !orgIdResponseObj || !orgIdResponseObj.cause || !orgIdResponseObj.cause.memberhub_id) {
    // not getting back correct response
    console.log('queryGiveBacksHubTokenInfoInContent query fail', errorInFetchOrgId, orgIdResponseObj);
    return ret;
  }

  ret.memberHubId = orgIdResponseObj.cause.memberhub_id;
  ret.appToken = appData.token;
  ret.appSecret = appData.secret;
  ret.hostPrefix = hostPrefix;
  console.log('queryGiveBacksHubTokenInfoInContent memberhub_id found', ret.memberHubId);
  return ret;
}

async function voidGiveBacksMemberInContent(hubToken, userid, userUUID) {

  let ret = {
    statusMsg: 'Fail to delete GiveBacks Member'
  };

  //DELETE https://api.memberhub.com/services/memberhub-service/memberships/13cef260-f452-4e4a-9392-1501b261a677?organization_uuid=d5994ad6-3f01-43ca-ba3f-0f17abce4a60&membership[deleted_at]=Mon%20Jun%2017%202024%2015:58:23%20GMT-0700%20(Pacific%20Daylight%20Time) HTTP/1.1
  const memberHubId = hubToken.memberHubId;
  const fetchUrl = 'https://api.memberhub.com/services/memberhub-service/memberships/' + userUUID + '?organization_uuid=' + memberHubId + '&membership[deleted_at]=' + encodeURIComponent(`${new Date()}`);
  console.log('voidGiveBacksMemberInContent prepare call', fetchUrl);
  let errorInFetch = false;
  const responseObj = await fetch(fetchUrl, {
    method: 'DELETE',
    //body: JSON.stringify(requestObj),
    headers: {
      //'Content-Type': 'application/json',
      'Authentication-Session-Token': hubToken.appToken,
      'Authentication-Session-Secret': hubToken.appSecret
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Fail to delete member. Wrong website?  HTTP status ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error(error);
      ret.statusMsg = ret.statusMsg + `${err}`;
      errorInFetch = true;
    });

  if (errorInFetch || !responseObj || !responseObj.membership) {
    // not getting back correct response
    ret.statusMsg = `Deleted Response not expected`
    return ret;
  }
  if (!responseObj.membership.user_id || responseObj.membership.user_id !== userid) {
    // not getting back correct response
    ret.statusMsg = `Deleted Response UserId not matching ${responseObj.user_id} input ${userid}`
    return ret;
  }
  ret.statusMsg = 'Success';
  return ret;
}

async function queryGiveBacksMemberInContent(hubToken) {

  function sleepAsync(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  console.log('queryGiveBacksMemberInContent called')

  let ret = {
    memberList: [],
    statusMsg: 'Fail to load GiveBacks Member'
  };

  const memberHubId = hubToken.memberHubId;

  console.log('queryGiveBacksMemberInContent appData.accessToken found');

  let pageNumIndex = 0;
  let getOffset = 0;
  while (true) {
    let errorInFetch = false;
    // cannot use MP_APISearchUrl here as it is passed to another page
    let fetchUrl = 'https://api.memberhub.com/services/memberhub-service/memberships?status=active&limit=50&organization_uuid=' + memberHubId;
    if (getOffset > 0) {
      fetchUrl = 'https://api.memberhub.com/services/memberhub-service/memberships?status=active&limit=50&offset=' + getOffset + '&organization_uuid=' + memberHubId;
    }
    console.log('queryGiveBacksMemberInContent prepare call', fetchUrl)
    const responseObj = await fetch(fetchUrl, {
      method: 'GET',
      //body: JSON.stringify(requestObj),
      headers: {
        //'Content-Type': 'application/json',
        'Authentication-Session-Token': hubToken.appToken,
        'Authentication-Session-Secret': hubToken.appSecret
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Fail to query GiveBacks. Wrong website?  HTTP status ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .catch(error => {
        console.error(error);
        ret.statusMsg = ret.statusMsg + `${err}`;
        errorInFetch = true;
      });

    if (errorInFetch || !responseObj || !responseObj.memberships || !responseObj.meta || responseObj.memberships.length !== responseObj.meta.count) {
      // not getting back correct response
      return ret;
    }

    for (const member of responseObj.memberships) {
      if (member.options) {
        ret.memberList.push({
          ID: member.user_id,
          FirstName: member.options.first_name,
          LastName: member.options.last_name,
          Email: member.options.email,
          MemberType: member.options.member_type,
          Uuid: member.uuid
        });
      }
    }

    getOffset = getOffset + responseObj.meta.count;
    // limit to max 100 K members.
    if (!responseObj.meta.has_more || pageNumIndex >= 1000) {
      console.log('queryGiveBacksMemberInContent ending call. current pageNumIndex', pageNumIndex)
      break;
    }
    console.log('queryGiveBacksMemberInContent prepare next call. current pageNumIndex', pageNumIndex)

    await sleepAsync(50);
    pageNumIndex++;
  }

  console.log('end of queryGiveBacksMemberInContent');
  ret.statusMsg = 'Success';
  return ret;
}

export async function loadGiveBacksMember() {
  OspUtil.log("loadGiveBacksMember called");

  const currentTabId = await BrExtHelper.getCurrentTabId();
  const browserExtHelper = new BrExtHelper(currentTabId);
  const hubTokenResult = await browserExtHelper.executeFuncInContent(queryGiveBacksHubTokenInfoInContent);
  if (!hubTokenResult || !hubTokenResult.memberHubId || !hubTokenResult.appToken || !hubTokenResult.appSecret) {
    return 'failed to get memberHubId';
  }

  const result = await browserExtHelper.executeFuncInContent(queryGiveBacksMemberInContent, [hubTokenResult]);
  let statusMsg = '';
  if (result) {
    statusMsg = result.statusMsg;
    if (result.memberList && (result.memberList.length > 0 || result.memberList.length === 0)) {
      const rowsPatched = [];
      for (const [index, row] of result.memberList.entries()) {
        // we only ask for active GiveBackmembers
        rowsPatched.push(MemberHelper.patchMpMember(row));
      }
      chrome.runtime.sendMessage({
        MPMemberList: {
          lastUpdate: Date.now(),
          memberList: rowsPatched
        }
      });
    }
  }
  return statusMsg;
}

export async function batchVoidGiveBacksMember(gbMemberList, extraWaitTimeMs, updateStatusFunc, updateErrorFunc) {
  OspUtil.log("batchVoidGiveBacksMember called");

  const currentTabId = await BrExtHelper.getCurrentTabId();
  const browserExtHelper = new BrExtHelper(currentTabId);
  const hubTokenResult = await browserExtHelper.executeFuncInContent(queryGiveBacksHubTokenInfoInContent);
  if (!hubTokenResult || !hubTokenResult.memberHubId || !hubTokenResult.appToken || !hubTokenResult.appSecret) {
    return 'failed to get memberHubId';
  }

  let retMsg = ''
  for (const [memberIndex, member] of gbMemberList.entries()) {

    const memberInfo = `${member.FirstName} ${member.LastName} ${member.Email} (${memberIndex + 1} of ${gbMemberList.length})`;
    updateStatusFunc(`begin to delete ${memberInfo}`);

    if (!member.Uuid || !member.ID) {
      updateErrorFunc(`No Uuid to delete ${memberIndex} ID ${member.ID}`);
      retMsg = retMsg + `No Uuid to delete ${memberIndex} ID ${member.ID}`;
      continue;
    }
    const delRes = await browserExtHelper.executeFuncInContent(voidGiveBacksMemberInContent, [hubTokenResult, member.ID, member.Uuid]);
    if (!delRes) {
      updateErrorFunc(`Fail to delete ${memberIndex} ID ${member.ID}`);
      retMsg = retMsg + `Fail to delete ${memberIndex} ID ${member.ID}`;
    } else if (delRes.statusMsg !== 'Success') {
      updateErrorFunc(`Fail to delete ${memberIndex} ID ${member.ID} ${delRes.statusMsg}`);
      retMsg = retMsg + `Fail to delete ${memberIndex} ID ${member.ID} ${delRes.statusMsg}`;
    }

    await OspUtil.sleep(extraWaitTimeMs);
  }

  return retMsg;
}

async function updateOSPMemberMPIDInContent(mpidUpdateList) {
  console.log('queryOSPMemberInContent called');

  let errorMsg = '';
  const responseObj = await fetch('/PtaMembership/UpdateOSPMemberMPID', {
    method: 'POST',
    body: JSON.stringify(mpidUpdateList),
    headers: {
      'Content-Type': 'application/json',
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Fail to Update OSPMember MPID, Wrong website?. HTTP status ${response.status}  ${response.statusText}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error(error)
      errorMsg = `${error}`;
    });

  const ret = {
    statusMsg: `Fail to update OSPMember MPID ${errorMsg}`
  };

  if (!responseObj || (!responseObj.length && responseObj.length !== 0)) {
    return ret;
  }

  ret.statusMsg = `Success. ${responseObj.length} entry updated`;
  return ret;
}

export async function updateOSPMemberMPID(ospMemberList) {
  OspUtil.log("updateOSPMemberMPID called");

  const mpidUpdateList = [];
  for (const member of ospMemberList) {
    if (member.MatchedMPMember && !OspUtil.strEqualIgnoreCase(`${member.MatchedMPMember.MPID}`, `${member.MPIDString}`)) {
      mpidUpdateList.push({
        MPID: member.MatchedMPMember.MPID,
        dbID: member.dbID,
        IsStudent: member.IsStudent,
      })
    }
  }

  const currentTabId = await BrExtHelper.getCurrentTabId();
  const browserExtHelper = new BrExtHelper(currentTabId);
  const result = await browserExtHelper.executeFuncInContent(updateOSPMemberMPIDInContent, [mpidUpdateList]);
  let statusMsg = '';
  if (result) {
    statusMsg = result.statusMsg;
  }
  return statusMsg;
}

export function patchOspUserRecord(ospFamilyInfoList, classroomFinder, allowNoParentStudent, allowEmptyValueOverwrite) {
  OspUtil.log("patchOspUserRecord called");
  const adminNoteLabel = `data import ${OspUtil.getCurrentLocalDateStr()}`;
  const retMsg = [];
  for (const ospFamilyInfo of ospFamilyInfoList) {
    let teacherFind = false;
    if (ospFamilyInfo.TeacherFirstName || ospFamilyInfo.TeacherLastName || ospFamilyInfo.TeacherEmailAddress) {
      const classRoomInfo = classroomFinder.GetClassroomId(ospFamilyInfo.TeacherFirstName, ospFamilyInfo.TeacherLastName, ospFamilyInfo.TeacherEmailAddress);
      if (classRoomInfo) {
        teacherFind = true;
        ospFamilyInfo.TeacherFirstName = classRoomInfo.TeacherFirstName;
        ospFamilyInfo.TeacherLastName = classRoomInfo.TeacherLastName;
        ospFamilyInfo.TeacherEmailAddress = classRoomInfo.TeacherEmailAddress;
        ospFamilyInfo.ClassroomID = `${classRoomInfo.ClassroomID}`
      } else {
        retMsg.push(`Row ${ospFamilyInfo.ID} Teacher with Email ${ospFamilyInfo.TeacherEmailAddress} FirstName ${ospFamilyInfo.TeacherFirstName} LastName ${ospFamilyInfo.TeacherLastName} Not Found `)
      }
    }

    if (!teacherFind) {
      ospFamilyInfo.TeacherFirstName = '';
      ospFamilyInfo.TeacherLastName = '';
      ospFamilyInfo.TeacherEmailAddress = '';
      ospFamilyInfo.ClassroomID = '';
    }

    ospFamilyInfo.AllowNoParentStudent = allowNoParentStudent ? 'true' : '';
    ospFamilyInfo.AllowEmptyValueOverwrite = allowEmptyValueOverwrite ? 'true' : '';
    ospFamilyInfo.AdminNoteLabel = adminNoteLabel;
  }

  return retMsg;
}

export async function uploadOSPUser(ospFamilyInfoList, allowNoParentStudent, allowEmptyValueOverwrite) {
  OspUtil.log("uploadOSPUser called");
  const ret = {
    retMsg: [],
    statusMsg: `Fail to getTeacherClassroomInfoList`
  };

  const teacherClassroomInfoListResponse = await getTeacherClassroomInfoList();
  if (teacherClassroomInfoListResponse.statusMsg !== 'Success') {
    ret.retMsg.push(teacherClassroomInfoListResponse.statusMsg);
    return ret;
  }
  const teacherClassroomInfoList = teacherClassroomInfoListResponse.teacherClassRoomInfoList;
  const classroomFinder = new ClassroomFinder(teacherClassroomInfoList);
  const patchMsgList = patchOspUserRecord(ospFamilyInfoList, classroomFinder, allowNoParentStudent, allowEmptyValueOverwrite)
  for (const patchMsg of patchMsgList) {
    ret.retMsg.push(patchMsg);
  }

  const addResponse = await AddStudentAndTwoParents(ospFamilyInfoList);
  if (addResponse.statusMsg !== 'Success') {
    ret.retMsg.push(addResponse.statusMsg);
  }

  for (const responseMsg of addResponse.responseList) {
    ret.retMsg.push(responseMsg);
  }

  if (addResponse.statusMsg !== 'Success') {
    return ret;
  }

  ret.statusMsg = 'Success';
  return ret;
}

class SyncHelper {

  constructor(curTabId, extraWaitTimeMs) {
    this.browserExtHelper = new BrExtHelper(curTabId);
    this.browserExtHelper.setExtraWaitTimeMs(extraWaitTimeMs);
    this.currentTabHost = '';
  }

  setHostBase(host) {
    this.currentTabHost = host;
  }

  abandonRemainingRequests() {
    this.browserExtHelper.abandonRemainingRequests();
  }

  async findMember(firstName, lastName, email) {
    await this.browserExtHelper.gotoUrl(MP_memberInformationUrl);

    if (email) {
      await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$txtSearchByEmail']", email);
    } else {
      await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$txtSearchByFirstName']", firstName);
      await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$txtSearchByLastName']", lastName);
    }
    let userStatusOptionSelector = "select[name='ctl00$ContentPlaceHolder$ddlMemberStatus']";
    let userStatusOptionText = await this.browserExtHelper.getSelectOptionText(userStatusOptionSelector);
    let statusAllText = 'Status: All';
    if (!OspUtil.strEqualIgnoreCase(statusAllText, userStatusOptionText)) {
      await this.browserExtHelper.ajaxAction(MP_memberInformationUrl, async () => await this.browserExtHelper.selectOptionByText(userStatusOptionSelector, statusAllText));
    }
    await this.browserExtHelper.ajaxAction(MP_memberInformationUrl, async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_lnkSearch', 'MAIN'));

    let recordText = await this.browserExtHelper.getEleText('#ctl00_ContentPlaceHolder_gridForms_ctl00_Pager > tbody > tr > td div > ul > li > span');
    return OspUtil.extractNumberFromString(recordText);
  }

  // dummy email should always be non empty.
  async addNewMember(ospMember) {
    await this.browserExtHelper.gotoUrl(MP_quickAddMembersUrl);

    let firstName = ospMember.FirstName;
    let lastName = ospMember.LastName;
    let email = ospMember.Email ? ospMember.Email.trim() : '';
    let dummyEmail = `u${ospMember.dbID}_${ospMember.IsStudent ? 's' : 'p'}@ewaeh.org`;
    let isStudent = ospMember.IsStudent;
    let streetAddress = ospMember.Address;
    let city = ospMember.City;
    let state = ospMember.State;
    let zip = ospMember.ZipCode;

    await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$gridNewMembers$ctl02$FirstName']", firstName);
    await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$gridNewMembers$ctl02$LastName']", lastName);
    await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$gridNewMembers$ctl02$EmailAddress']", email || dummyEmail);
    await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$gridNewMembers$ctl02$Quantity']", "1");

    await this.browserExtHelper.ajaxAction(MP_quickAddMembersUrl, async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_LnkSaveandaAddMore', 'MAIN'));

    let recordsFound = await this.findMember(firstName, lastName, email || dummyEmail);
    if (recordsFound !== 1) {
      throw new Error(`Could not locate unique record (${recordsFound} found) for ${firstName},${lastName},${email}. ` + (recordsFound > 0 ? "Please completely remove all record for this user on MP site directly and re-upload." : ''));
    }

    // click to go to details page
    await this.browserExtHelper.pageAction(async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_gridForms_ctl00_ctl04_lnkMemberDetails', 'MAIN'));
    await this.setMembershipLevel(1);
    await this.setMemberType(isStudent ? 'Student' : 'Parent / Guardian', firstName, lastName);
    await this.setMemberAddress(streetAddress, city, state, zip);
    if (!email) {
      await this.clearDummyEmail();
    }
  }

  // must be at member details page
  async setMembershipLevel(targetIndex) {
    // open level dialog
    await this.browserExtHelper.ajaxAction(MP_memberDetailsUrl, async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_lnkMembershipLevelEdit', 'MAIN'));

    // change level index if needed
    let levelOptionSelector = "select[name='ctl00$ContentPlaceHolder$ddlMembershiplevelEdit']";
    let levelIndex = await this.browserExtHelper.getSelectOptionIndex(levelOptionSelector);
    if (levelIndex !== targetIndex) {
      await this.browserExtHelper.ajaxAction(MP_memberDetailsUrl, async () => await this.browserExtHelper.selectOptionIndex(levelOptionSelector, targetIndex));
    }
    // save and back to details page
    await this.browserExtHelper.ajaxAction(MP_memberDetailsUrl, async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_lnkMembershiplevelSave', 'MAIN'));
  }

  // must be at member details page
  async setMemberType(targetType, firstName, lastName) {
    // open info dialog
    await this.browserExtHelper.ajaxAction(MP_memberDetailsUrl, async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_lnkMemberinfoEdit', 'MAIN'));

    await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$FirstName']", firstName);
    await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$LastName']", lastName);

    // change type index if needed
    let typeOptionSelector = "select[name='ctl00$ContentPlaceHolder$ddlType']";
    let typeText = await this.browserExtHelper.getSelectOptionText(typeOptionSelector);
    if (typeText !== targetType) {
      // type change is not an ajax select
      await this.browserExtHelper.selectOptionByText(typeOptionSelector, targetType);
    }
    // save and back to details page
    await this.browserExtHelper.ajaxAction(MP_memberDetailsUrl, async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_lnkSaveBasicInfo', 'MAIN'));
  }

  // must be at member details page
  async setMemberAddress(address, city, state, zip) {
    // open info dialog
    await this.browserExtHelper.ajaxAction(MP_memberDetailsUrl, async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_lnkLocationEdit', 'MAIN'));

    let countryOptionSelector = "select[name='ctl00$ContentPlaceHolder$CountryFk']";
    let countryText = await this.browserExtHelper.getSelectOptionText(countryOptionSelector);
    let targetCountry = 'United States of America';
    if (!OspUtil.strEqualIgnoreCase(targetCountry, countryText)) {
      await this.browserExtHelper.ajaxAction(MP_memberDetailsUrl, async () => await this.browserExtHelper.selectOptionByText(countryOptionSelector, targetCountry));
    }
    let timezoneOptionSelector = "select[name='ctl00$ContentPlaceHolder$TimeZoneFk']";
    // timezone change is not an ajax select so we can always set it.
    await this.browserExtHelper.selectOptionIndex(timezoneOptionSelector, 1);

    await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$StreetAddress']", address);
    await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$City']", city);
    await this.browserExtHelper.selectOptionByText("select[name='ctl00$ContentPlaceHolder$StateFk']", OspUtil.getStateCode(state));
    await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$ZipCode']", zip);

    // save and back to details page
    await this.browserExtHelper.ajaxAction(MP_memberDetailsUrl, async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_lnkSaveLocationContactBottom', 'MAIN'));
  }

  // must be at member details page
  async clearDummyEmail() {
    // open info dialog
    await this.browserExtHelper.ajaxAction(MP_memberDetailsUrl, async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_lnkContactEdit', 'MAIN'));

    await this.browserExtHelper.setElmText("input[name='ctl00$ContentPlaceHolder$txtPrimaryEmailAddr']", '');
    // save and back to details page
    await this.browserExtHelper.ajaxAction(MP_memberDetailsUrl, async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_lnkConSave', 'MAIN'));
  }

  async renewMember(ospMember, mpMember) {
    let recordsFound = await this.findMember(ospMember.FirstName, ospMember.LastName, ospMember.Email);
    if (recordsFound !== 1) {
      throw new Error(`Could not locate unique record (${recordsFound} found) for ${ospMember.FirstName},${ospMember.LastName},${ospMember.Email}. ` + (recordsFound > 0 ? "Please completely remove all record for this user on MP site directly and re-upload." : ''));
    }

    // click to go to details page
    await this.browserExtHelper.pageAction(async () => await this.browserExtHelper.clickElm('a#ctl00_ContentPlaceHolder_gridForms_ctl00_ctl04_lnkMemberDetails', 'MAIN'));
    await this.setMembershipLevel(1);
    if (!OspUtil.strEqualIgnoreCase(ospMember.FirstName, mpMember.FirstName) || !OspUtil.strEqualIgnoreCase(ospMember.LastName, mpMember.LastName)) {
      await this.setMemberType(ospMember.IsStudent ? 'Student' : 'Parent/Guardian', ospMember.FirstName, ospMember.LastName);
    }
    if (!OspUtil.strEqualIgnoreCase('[Restricted]', mpMember.Address)) {
      if (!OspUtil.strEqualIgnoreCase(ospMember.Address, mpMember.Address)) {
        await this.setMemberAddress(ospMember.Address, ospMember.City, ospMember.State, ospMember.ZipCode);
      }
    }
  }

  async addNewGiveBacksMember(ospMember, reinitPage) {
    if (reinitPage) {
      // await this.browserExtHelper.ajaxAction('https://api.memberhub.com/services/memberhub-service/memberships', async () => await this.browserExtHelper.gotoUrl(`https://${this.currentTabHost}/memberships?status=active&limit=50`));
      await this.browserExtHelper.gotoUrl(`https://${this.currentTabHost}/memberships?status=active&limit=50`);
    }

    const firstName = ospMember.FirstName;
    const lastName = ospMember.LastName;
    const email = ospMember.Email ? ospMember.Email.trim() : '';
    const isStudent = ospMember.IsStudent;
    const memberType = isStudent ? 'Student' : 'Parent/Guardian';
    // click the Add cash member button
    await this.browserExtHelper.clickElm('div.MemberHub-Page__Top > div.MemberHub-Page__Header > button:enabled', 'MAIN')
    // wait for option to populate
    await this.browserExtHelper.waitForElm('div.MemberHub-Modal__Section #Select-Item > option:nth-child(2)')
    await this.browserExtHelper.waitForElm('div.modal-footer > button.MemberHub-Button-primary.btn-primary:enabled');
    // select item type with memberType
    await this.browserExtHelper.selectOptionByText('div.MemberHub-Modal__Section #Select-Item', memberType);
    // select memberType and info
    await this.browserExtHelper.selectOptionByText('div.MemberHub-Modal__Section #Member-type', memberType);
    await this.browserExtHelper.setCheckboxState("div.MemberHub-Modal__Section div.MemberHub-CheckboxGroup__Input > input:enabled", false);
    await this.browserExtHelper.setElmText("div.MemberHub-Modal__Section input#First-name:enabled", firstName);
    await this.browserExtHelper.setElmText("div.MemberHub-Modal__Section input#Last-name:enabled", lastName);
    await this.browserExtHelper.setElmText("div.MemberHub-Modal__Section input#Email:enabled", email);
    // click Save. somehow we cannot intecept the cross domain request
    // await this.browserExtHelper.ajaxAction('https://api.memberhub.com/services/memberhub-service/memberships*', async () => await this.browserExtHelper.clickElm('div.modal-footer > button.MemberHub-Button-primary.btn-primary', 'MAIN'));
    await this.browserExtHelper.clickElm('div.modal-footer > button.MemberHub-Button-primary.btn-primary', 'MAIN')
    // wait for Save button to disappear
    await this.browserExtHelper.waitForElmDisappear('div.modal-footer > button.MemberHub-Button-primary.btn-primary');
  }
}

export async function syncGiveBacksMember(currentTabHost, memberToUploadList, extraWaitTimeMs, updateStatusFunc, updateErrorFunc) {
  const currentTabId = await BrExtHelper.getCurrentTabId();
  const errorMsgs = [];
  let reinitPage = true;
  for (const [memberIndex, member] of memberToUploadList.entries()) {
    const memberInfo = `${member.FirstName} ${member.LastName} ${member.Email} (${memberIndex + 1} of ${memberToUploadList.length})`;
    let actionInfo = '';
    const syncHelper = new SyncHelper(currentTabId, parseInt(extraWaitTimeMs));
    syncHelper.setHostBase(currentTabHost);
    try {
      OspUtil.log(`process ${memberInfo}`, member)
      await OspUtil.asyncCallWithTimeout(async () => {
        if (member.Status === MemberHelper.MPSyncStatus.NeedToAdd) {
          actionInfo = 'add new member';
          updateStatusFunc(`begin to ${actionInfo} ${memberInfo}`);
          await syncHelper.addNewGiveBacksMember(member, reinitPage);
          reinitPage = false;
        }
        // if (member.Status === MemberHelper.MPSyncStatus.NeedToRenew) {
        //   actionInfo = 'renew existing member';
        //   updateStatusFunc(`begin to ${actionInfo} ${memberInfo}`);
        //   await syncHelper.renewMember(member, member.MatchedMPMember);
        // }
      }, 60000);
    }
    catch (err) {
      reinitPage = true;
      OspUtil.error(`Failed to ${actionInfo} ${memberInfo}`, err);
      syncHelper.abandonRemainingRequests();
      const errInfo = `Failed to ${actionInfo} ${memberInfo} ${err}`;
      updateErrorFunc(`Last error: ${errInfo}`);
      errorMsgs.push(errInfo);
    }
  }
  updateStatusFunc('end of sync members');
  return errorMsgs.join(', ');
}

export async function syncMemberPlanetMember(memberToUploadList, extraWaitTimeMs, updateStatusFunc, updateErrorFunc) {
  const currentTabId = await BrExtHelper.getCurrentTabId();
  const errorMsgs = [];
  for (const [memberIndex, member] of memberToUploadList.entries()) {
    const memberInfo = `${member.FirstName} ${member.LastName} ${member.Email} (${memberIndex + 1} of ${memberToUploadList.length})`;
    let actionInfo = '';
    const syncHelper = new SyncHelper(currentTabId, parseInt(extraWaitTimeMs));
    try {
      OspUtil.log(`process ${memberInfo}`, member)
      await OspUtil.asyncCallWithTimeout(async () => {
        if (member.Status === MemberHelper.MPSyncStatus.NeedToAdd) {
          actionInfo = 'add new member';
          updateStatusFunc(`begin to ${actionInfo} ${memberInfo}`);
          await syncHelper.addNewMember(member);
        }
        if (member.Status === MemberHelper.MPSyncStatus.NeedToRenew) {
          actionInfo = 'renew existing member';
          updateStatusFunc(`begin to ${actionInfo} ${memberInfo}`);
          await syncHelper.renewMember(member, member.MatchedMPMember);
        }
      }, 60000);
    }
    catch (err) {
      OspUtil.error(`Failed to ${actionInfo} ${memberInfo}`, err);
      syncHelper.abandonRemainingRequests();
      const errInfo = `Failed to ${actionInfo} ${memberInfo} ${err}`;
      updateErrorFunc(`Last error: ${errInfo}`);
      errorMsgs.push(errInfo);
    }
  }
  updateStatusFunc('end of sync members');
  return errorMsgs.join(', ');
}

class ClassroomFinder {

  constructor(teacherClassInfoList) {
    // Dictionary<string, TeacherClassRoomInfo>()
    this._emailName2Classroom = {};
    this._email2Classroom = {};
    this._name2Classroom = {};
    this._FirstNameInit2Classroom = {};

    for (const info of teacherClassInfoList) {
      if (!OspUtil.isNullOrWhiteSpace(info.TeacherEmailAddress)) {
        this._email2Classroom[this.GetDictKey(info.TeacherEmailAddress)] = info;
        this._emailName2Classroom[this.GetDictKey(info.TeacherFirstName, info.TeacherLastName, info.TeacherEmailAddress)] = info;
      }

      if (!OspUtil.isNullOrWhiteSpace(info.TeacherLastName)) {
        this._FirstNameInit2Classroom[this.GetDictKey(this.GetFirstNameInitial(info.TeacherFirstName), info.TeacherLastName)] = info;
        this._name2Classroom[this.GetDictKey(info.TeacherFirstName, info.TeacherLastName)] = info;
      }
    }
  }

  GetClassroomId(firstName, lastName, email) {
    const emailNameKey = this.GetDictKey(firstName, lastName, email);
    if (this._emailName2Classroom[emailNameKey]) {
      return this._emailName2Classroom[emailNameKey];
    }

    const emailKey = this.GetDictKey(email);
    if (this._email2Classroom[emailKey]) {
      return this._email2Classroom[emailKey];
    }

    const nameKey = this.GetDictKey(firstName, lastName);
    if (this._name2Classroom[nameKey]) {
      return this._name2Classroom[nameKey];
    }

    if (!firstName) {
      let firstNameInitial = firstName;
      if (firstName.length == 2 && firstName[1] == '.') {
        firstNameInitial = this.GetFirstNameInitial(firstName);
      }
      const fisrtNameInitialKey = this.GetDictKey(firstNameInitial, lastName);
      if (this._FirstNameInit2Classroom[fisrtNameInitialKey]) {
        return this._FirstNameInit2Classroom[fisrtNameInitialKey];
      }
    }
    return null;
  }

  GetFirstNameInitial(firstName) {
    if (OspUtil.isNullOrWhiteSpace(firstName)) {
      return '';
    }
    return firstName.substring(0, 1);
  }

  CleanString(input) {
    if (OspUtil.isNullOrWhiteSpace(input)) {
      return '';
    }

    return input.trim().toLowerCase().replace(/\t/g, ' ');
  }

  GetDictKey(email) {
    return `${this.CleanString(email)}`;
  }

  GetDictKey(firstName, lastName) {
    return `${this.CleanString(firstName)}\t${this.CleanString(lastName)}`;
  }

  GetDictKey(firstName, lastName, email) {
    return `${this.CleanString(firstName)}\t${this.CleanString(lastName)}\t${this.CleanString(email)}`;
  }
}