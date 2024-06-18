let log = console.log;

log('Put the background scripts here changed.');

function sendDataUpdateMsg() {
    log("sending memberList called");
    chrome.storage.local.get(['ospMemberList', 'mpMemberList']).then((result) => {
        let ospMemberList = {
            lastUpdate: 0,
            memberList: []
        };
        if (result.ospMemberList && result.ospMemberList.memberList && (result.ospMemberList.memberList.length > 0 || result.ospMemberList.memberList.length === 0)) {
            ospMemberList = result.ospMemberList;
        }

        let mpMemberList = {
            lastUpdate: 0,
            memberList: []
        };
        if (result.mpMemberList && result.mpMemberList.memberList && (result.mpMemberList.memberList.length > 0 || result.mpMemberList.memberList.length === 0)) {
            mpMemberList = result.mpMemberList;
        }

        log("memberList sent");
        chrome.runtime.sendMessage({
            MemberListUpdated: true,
            ospMemberList: ospMemberList,
            mpMemberList: mpMemberList,
        });
    });
}


async function bgHandleMessages(message) {
    log("bgHandleMessages called");

    let memberListUpdate = false;
    if (message.MPMemberList) {
        await chrome.storage.local.set({ mpMemberList: message.MPMemberList }).then(() => {
            log("mpMemberList is saved");
        });
        memberListUpdate = true;
    }
    if (message.OSPMemberList) {
        await chrome.storage.local.set({ ospMemberList: message.OSPMemberList }).then(() => {
            log("ospMemberList is saved");
        });
        memberListUpdate = true;
    }

    if (memberListUpdate || message.RequestMemberList) {
        sendDataUpdateMsg();
    }
}

chrome.runtime.onMessage.addListener(bgHandleMessages);