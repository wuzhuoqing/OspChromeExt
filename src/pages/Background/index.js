let log = console.log;

log('Put the background scripts here changed.');

function sendDataUpdateMsg() {
    log("sending memberList called");
    chrome.storage.local.get(['ospMemberList', 'mpMemberList']).then((result) => {
        let ospMemberList = [];
        if (result.ospMemberList && result.ospMemberList.length && result.ospMemberList.length > 0) {
            ospMemberList = result.ospMemberList;
        }

        let mpMemberList = [];
        if (result.mpMemberList && result.mpMemberList.length && result.mpMemberList.length > 0) {
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
    if (message.MemberPlanetMemberList) {
        await chrome.storage.local.set({ mpMemberList: message.MemberPlanetMemberList }).then(() => {
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