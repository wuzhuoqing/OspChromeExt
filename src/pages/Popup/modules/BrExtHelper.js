import secrets from 'secrets';

let extraWaitTimeMs = 0;

export function setExtraWaitTimeMs(timeMS) {
  extraWaitTimeMs = timeMS;
}

export async function getCurrentTab() {
  let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  let currTab = tabs[0];
  return currTab;
}

export async function getCurrentTabId() {
  let currTab = await getCurrentTab();
  return currTab.id;
}

export async function executeFuncInContent(currentTabId, func, world = 'ISOLATED') {
  log("executeFuncInContent called");
  let ret;
  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: func,
    world: world
  })
    .then(injectionResults => {
      for (const { frameId, result } of injectionResults) {
        if (frameId === 0) {
          log("executeFuncInContent returned");
          ret = result;
        }
      }
    });

  return ret;
}

async function waitForElmInContent(selector) {
  let elePromise = new Promise(resolve => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(mutations => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
  await elePromise;
  return selector;
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForElm(currentTabId, selector) {
  log("waitForElm called", selector);

  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: waitForElmInContent,
    args: [selector]
  })
    .then(injectionResults => {
      for (const { frameId, result } of injectionResults) {
        if (frameId === 0) {
          log("waitForElm returned", result);
        }
      }
    });

  if (extraWaitTimeMs > 0) {
    await sleep(extraWaitTimeMs);
  }
}

async function clickElmInContent(selector) {
  let ele = document.querySelector(selector);
  ele.click();
  return selector;
}

export async function clickElm(currentTabId, selector, world = 'ISOLATED') {
  log('clickElm called', selector, world);

  await waitForElm(currentTabId, selector);

  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: clickElmInContent,
    args: [selector],
    world: world,
  })
    .then(injectionResults => {
      for (const { frameId, result } of injectionResults) {
        if (frameId === 0) {
          log("clickElm returned", result);
        }
      }
    });
}

async function setElmTextInContent(selector, strText) {
  let ele = document.querySelector(selector);
  ele.value = strText;
  return selector;
}

export async function setElmText(currentTabId, selector, strText) {
  log('setElmText called', selector, strText);

  await waitForElm(currentTabId, selector);

  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: setElmTextInContent,
    args: [selector, strText]
  })
    .then(injectionResults => {
      for (const { frameId, result } of injectionResults) {
        if (frameId === 0) {
          log("setElmText returned", result);
        }
      }
    });
}

async function selectOptionIndexInContent(selector, index) {
  let ele = document.querySelector(selector);
  ele.selectedIndex = index;
  ele.dispatchEvent(new Event('change', { bubbles: true }));
  return selector;
}

export async function selectOptionIndex(currentTabId, selector, index) {
  log('selectOptionIndex called', selector, index);

  await waitForElm(currentTabId, selector);

  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: selectOptionIndexInContent,
    args: [selector, index]
  })
    .then(injectionResults => {
      for (const { frameId, result } of injectionResults) {
        if (frameId === 0) {
          log("selectOptionIndex returned", result);
        }
      }
    });
}

async function getSelectOptionTextInContent(selector) {
  let ele = document.querySelector(selector);
  let optText = '';
  for (var i = 0; i < ele.options.length; i++) {
    if (ele.options[i].selected) {
      optText = ele.options[i].text;
      break;
    }
  }
  return optText;
}

export async function getSelectOptionText(currentTabId, selector) {
  log('getSelectOptionText called', selector);

  await waitForElm(currentTabId, selector);

  let optText = '';
  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: getSelectOptionTextInContent,
    args: [selector]
  })
    .then(injectionResults => {
      for (const { frameId, result } of injectionResults) {
        if (frameId === 0) {
          log("getSelectOptionText returned", result);
          optText = result;
        }
      }
    });
  return optText;
}

async function getSelectOptionIndexInContent(selector) {
  let ele = document.querySelector(selector);
  let optIndex = -1;
  for (var i = 0; i < ele.options.length; i++) {
    if (ele.options[i].selected) {
      optIndex = i;
      break;
    }
  }
  return optIndex;
}

export async function getSelectOptionIndex(currentTabId, selector) {
  log('getSelectOptionIndex called', selector);

  await waitForElm(currentTabId, selector);

  let optIndex = -1;
  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: getSelectOptionIndexInContent,
    args: [selector]
  })
    .then(injectionResults => {
      for (const { frameId, result } of injectionResults) {
        if (frameId === 0) {
          log("getSelectOptionIndex returned", result);
          optIndex = result;
        }
      }
    });
  return optIndex;
}

async function selectOptionByTextInContent(selector, optText) {
  let ele = document.querySelector(selector);
  for (var i = 0; i < ele.options.length; i++) {
    if (optText.localeCompare(ele.options[i].text, 'en', { sensitivity: 'base' }) === 0) {
      ele.selectedIndex = i;
      ele.dispatchEvent(new Event('change', { bubbles: true }));
      break;
    }
  }
  return selector;
}

export async function selectOptionByText(currentTabId, selector, optText) {
  log('selectOptionByText called', selector, optText);

  await waitForElm(currentTabId, selector);

  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: selectOptionByTextInContent,
    args: [selector, optText]
  })
    .then(injectionResults => {
      for (const { frameId, result } of injectionResults) {
        if (frameId === 0) {
          log("selectOptionByText returned", result);
        }
      }
    });
}

async function getEleTextInContent(selector) {
  let ele = document.querySelector(selector);
  return ele.innerText;
}

export async function getEleText(currentTabId, selector) {
  log('getEleText called', selector);

  await waitForElm(currentTabId, selector);

  let eleText = '';
  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    func: getEleTextInContent,
    args: [selector]
  })
    .then(injectionResults => {
      for (const { frameId, result } of injectionResults) {
        if (frameId === 0) {
          log("getEleText returned", result);
          eleText = result;
        }
      }
    });

  return eleText;
}

export async function gotoUrl(currentTabId, url) {
  await pageAction(currentTabId, async () => chrome.tabs.update(currentTabId, { url: url }));
}

export async function pageAction(currentTabId, action) {
  let nextRequestPromise = getBrowserNextCompletePromise(currentTabId);
  await action();
  await nextRequestPromise
}

export async function ajaxAction(currentTabId, ajaxTargetUrl, action) {
  let nextRequestPromise = getRequestNextCompletePromise(currentTabId, ajaxTargetUrl);
  await action();
  await nextRequestPromise
}

function getBrowserNextCompletePromise(curTabId) {
  let onUpdate;
  return new Promise((resolve) => {
    onUpdate = (tabId, info) => {
      log("tab onUpdated called called", info);
      if (tabId === curTabId && info.status === "complete") {
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdate);
  }).then(() => chrome.tabs.onUpdated.removeListener(onUpdate));
}

function getRequestNextCompletePromise(curTabId, targetUrl) {
  let onCompleted;
  return new Promise((resolve) => {
    onCompleted = (details) => {
      log("webrequest onCompleted called called", details);
      resolve();
    };
    chrome.webRequest.onCompleted.addListener(onCompleted, { urls: [targetUrl] });
  }).then(() => chrome.webRequest.onCompleted.removeListener(onCompleted));
}

export function log(...args) {
  if (!secrets.enableLog) {
    return;
  }
  console.trace(...args);
}

if (secrets.enableLog) {
  log = console.log;
}
