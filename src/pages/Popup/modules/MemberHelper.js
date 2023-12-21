import * as OspUtil from './OspUtil';

export let MPSyncStatus = {
  Unknown: 'Unknown',
  InSync: 'InSync',
  NeedToAdd: 'NeedToAdd',
  NeedToRenew: 'NeedToRenew',
  NeedToRenew: 'NeedToRenew',
  Duplicate: 'Duplicate',
  Extra: 'Extra',
}

export let SampleOspMember1 = {
  "Address": "15506 SE Test St",
  "City": "TestC",
  "Email": "T@hotmail.com",
  "FirstName": "TestU",
  "ID": 35774,
  "MPIDString": "148021",
  "IsStudent": true,
  "LastName": "Wu",
  "State": "WA",
  "Status": MPSyncStatus.Unknown,
  "ZipCode": "98059"
}

export let SampleMpMember1 = {
  "Address": "15 Test Ave Suite 202",
  "Email": "wspta@example.com",
  "FirstName": "WSPTA",
  "IsActive": false,
  "LastName": "Support",
  "MPID": 14860048,
  "MemberLevel": "",
  "Status": MPSyncStatus.Unknown
};

function trimAndFixFields(member) {
  member.Address = member.Address ? member.Address.trim() : '';
  member.FirstName = member.FirstName ? member.FirstName.trim() : '';
  member.LastName = member.LastName ? member.LastName.trim() : '';
  member.Email = member.Email ? member.Email.trim().toLowerCase() : '';

  member.Status = MPSyncStatus.Unknown;
  member.SimpleHashKey = getSimplyHashKey(member);
  member.ComplexHashKey = getComplexHashKey(member);
}

export function isCurrentPaidMember(mpMember) {
  return mpMember.IsActive && mpMember.MemberLevel;
}

function getSimplyHashKey(member) {
  return `${member.FirstName}_-_${member.LastName}`.toLowerCase();
}

function getComplexHashKey(member) {
  let houseNumber = "0000";

  if (member.Address && !OspUtil.strEqualIgnoreCase(member.Address, "(unknown)")) {
    let addressWords = member.Address.split(/[\s()]+/);
    if (addressWords.length > 0) {
      houseNumber = addressWords[0];
    }
  }
  return `${member.FirstName}_-_${member.LastName}_${houseNumber}`.toLowerCase();
}

function matchUpLocalAndRemoteListsBasedOnEmailAddress(ospMemberList, meMemberList) {
  const remoteMembersMap = {}
  const duplicateRemoteEmailAddresses = []
  for (const mpMember of meMemberList) {
    if (mpMember.Email) {
      if (remoteMembersMap[mpMember.Email]) {
        duplicateRemoteEmailAddresses.push(mpMember.Email);
      } else {
        remoteMembersMap[mpMember.Email] = mpMember
      }
    }
  }

  for (const dupEmail of duplicateRemoteEmailAddresses) {
    if (remoteMembersMap[dupEmail]) {
      delete remoteMembersMap[dupEmail];
    }
  }

  for (const ospMember of ospMemberList) {
    const matchedRemoteMember = remoteMembersMap[ospMember.Email];
    if (matchedRemoteMember) {
      ospMember.Status = isCurrentPaidMember(matchedRemoteMember) ? MPSyncStatus.InSync : MPSyncStatus.NeedToRenew;
      matchedRemoteMember.Status = isCurrentPaidMember(matchedRemoteMember) ? MPSyncStatus.InSync : MPSyncStatus.NeedToRenew;
      ospMember.MatchedMPMember = matchedRemoteMember;
    }
  }
}

function MatchUpLocalAndRemoteListsBasedOnMPID(ospMemberList, meMemberList) {
  const ospMembersMap = {}
  const duplicateMPIDs = []
  for (const ospMember of ospMemberList) {
    if (ospMember.Status === MPSyncStatus.Unknown && ospMember.MPIDString) {
      if (ospMembersMap[ospMember.MPIDString]) {
        duplicateMPIDs.push(ospMember.MPIDString);
      } else {
        ospMembersMap[ospMember.MPIDString] = ospMember
      }
    }
  }

  for (const mpID of duplicateMPIDs) {
    if (ospMembersMap[mpID]) {
      delete ospMembersMap[mpID];
    }
  }

  for (const mpMember of meMemberList) {
    if (mpMember.Status === MPSyncStatus.Unknown) {
      const matchedOspMember = ospMembersMap[`${mpMember.MPID}`];
      if (matchedOspMember) {
        matchedOspMember.Status = isCurrentPaidMember(mpMember) ? MPSyncStatus.InSync : MPSyncStatus.NeedToRenew;
        mpMember.Status = isCurrentPaidMember(mpMember) ? MPSyncStatus.InSync : MPSyncStatus.NeedToRenew;
        matchedOspMember.MatchedMPMember = mpMember;
      }
    }
  }
}

// this is to handle after we do email and MPID matches. Those should all be with status Unknown in this phase
function MarkDuplicates(membersWithSameNames) {
  for (const member of membersWithSameNames) {
    if (member.Status !== MPSyncStatus.Duplicate) {
      const complexHashKey = member.ComplexHashKey;
      const dups = membersWithSameNames.filter(potentialDup => potentialDup.ComplexHashKey == complexHashKey);

      if (dups.length > 1) {
        for (const dup in dups) {
          dup.Status = MPSyncStatus.Duplicate;
        }
      }
    }
  }
}

function addMemberToDictList(dictObj, hashKey, member) {
  if (!dictObj[hashKey]) {
    dictObj[hashKey] = [];
  }
  dictObj[hashKey].push(member);
}

function MatchUpLocalAndRemoteListsBasedOnNameAddress(ospMemberList, meMemberList) {
  const localMembersMap = {};
  const currentRemoteMembersMap = {};
  const expiredRemoteMembersMap = {};

  for (const ospMember of ospMemberList) {
    if (ospMember.Status === MPSyncStatus.Unknown) {
      addMemberToDictList(localMembersMap, ospMember.SimpleHashKey, ospMember);
    }
  }

  for (const [hkey, mList] of Object.entries(localMembersMap)) {
    if (mList.length > 1) {
      MarkDuplicates(mList);
    }
  }

  // for member planet. There maybe many inactive member we don't want to do de-dup work
  for (const mpMember of meMemberList) {
    if (mpMember.Status === MPSyncStatus.Unknown) {
      addMemberToDictList(isCurrentPaidMember(mpMember) ? currentRemoteMembersMap : expiredRemoteMembersMap, mpMember.SimpleHashKey, mpMember);
    }
  }
  // only do for active MP Users
  for (const [hkey, mList] of Object.entries(currentRemoteMembersMap)) {
    if (mList.length > 1) {
      MarkDuplicates(mList);
    }
  }

  // match begin.
  for (const localMember of ospMemberList) {
    // first match with active MP members
    if (localMember.Status === MPSyncStatus.Unknown) {
      if (currentRemoteMembersMap[localMember.SimpleHashKey]) {
        const easyMatchingRemoteMembers = currentRemoteMembersMap[localMember.SimpleHashKey];
        if ((easyMatchingRemoteMembers.length === 1) && (localMembersMap[localMember.SimpleHashKey].length === 1)) {
          // Matching on simple key is sufficient.  This person has a unique first/last name, and 
          // there is no ambiguity.  Don't use the house number as a qualifier.
          localMember.Status = MPSyncStatus.InSync;
          easyMatchingRemoteMembers[0].Status = MPSyncStatus.InSync;
          localMember.MatchedMPMember = easyMatchingRemoteMembers[0];
        } else {
          // There are multiple people with the same name.  Use the house number as
          // a distiguisher.
          const perfectMatchingRemoteMembers = easyMatchingRemoteMembers.filter(remoteMember => remoteMember.ComplexHashKey === localMember.ComplexHashKey);
          if (perfectMatchingRemoteMembers.length > 0) {
            // set to InSync to avoid upload this local member for now. Will need admins to fix dup users on MP sites.
            localMember.Status = MPSyncStatus.InSync;
            if (perfectMatchingRemoteMembers.length === 1) {
              perfectMatchingRemoteMembers[0].Status = MPSyncStatus.InSync;
              localMember.MatchedMPMember = perfectMatchingRemoteMembers[0];
            } else {
              // here the member should have been marked as dup
              OspUtil.log('Member dup with same address', localMember, perfectMatchingRemoteMembers);
            }
          }
        }
      }
    }

    // if still not matched. search inactives
    if (localMember.Status === MPSyncStatus.Unknown) {
      if (expiredRemoteMembersMap[localMember.SimpleHashKey]) {
        const easyMatchingRemoteMembers = expiredRemoteMembersMap[localMember.SimpleHashKey];
        if ((easyMatchingRemoteMembers.length === 1) && (localMembersMap[localMember.SimpleHashKey].length === 1)) {
          // Matching on simple key is sufficient.  This person has a unique first/last name, and 
          // there is no ambiguity.  Don't use the house number as a qualifier.
          localMember.Status = MPSyncStatus.NeedToRenew;
          localMember.MatchedMPMember = easyMatchingRemoteMembers[0];
        } else {
          // There are multiple people with the same name.  Use the house number as
          // a distiguisher.
          const perfectMatchingRemoteMembers = easyMatchingRemoteMembers.filter(remoteMember => remoteMember.ComplexHashKey === localMember.ComplexHashKey);

          if (perfectMatchingRemoteMembers.length === 1) {
            localMember.Status = MPSyncStatus.NeedToRenew;
            localMember.MatchedMPMember = perfectMatchingRemoteMembers[0];
          }
        }
      }
    }

    // if still not matched, consider as new user to add
    if (localMember.Status === MPSyncStatus.Unknown) {
      localMember.Status = MPSyncStatus.NeedToAdd;
    }
  }

  // any MP member not matched is extra
  for (const mpMember of meMemberList) {
    if (mpMember.Status === MPSyncStatus.Unknown) {
      mpMember.Status = MPSyncStatus.Extra;
    }
  }
}

export function cleanAndMatchOspMpMembers(ospMemberList, meMemberList) {
  for (const member of ospMemberList) {
    trimAndFixFields(member);
  }
  for (const member of meMemberList) {
    trimAndFixFields(member);
  }

  matchUpLocalAndRemoteListsBasedOnEmailAddress(ospMemberList, meMemberList);
  MatchUpLocalAndRemoteListsBasedOnMPID(ospMemberList, meMemberList);
  MatchUpLocalAndRemoteListsBasedOnNameAddress(ospMemberList, meMemberList);
}

export function getExtraMemberWarningMsg(memberList) {
  const sbInfoList = [];
  for (const member of memberList) {
    if (member.Status === MPSyncStatus.Duplicate || member.Status === MPSyncStatus.Extra) {
      sbInfoList.push(`${member.Status === MPSyncStatus.Duplicate ? "Duplicate Member" : "Extra Member"} ${member.FirstName} ${member.LastName} ${member.Email}`);
      if (sbInfoList.length > 5) {
        sbInfoList.push("etc");
        break;
      }
    }
  }
  return sbInfoList.join(', ')
}