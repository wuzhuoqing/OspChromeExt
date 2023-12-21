import * as OspUtil from './OspUtil';

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

async function clickElmInContent(selector) {
  let ele = document.querySelector(selector);
  ele.click();
  return selector;
}

async function setElmTextInContent(selector, strText) {
  let ele = document.querySelector(selector);
  ele.value = strText;
  return selector;
}

async function selectOptionIndexInContent(selector, index) {
  let ele = document.querySelector(selector);
  ele.selectedIndex = index;
  ele.dispatchEvent(new Event('change', { bubbles: true }));
  return selector;
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

async function getEleTextInContent(selector) {
  let ele = document.querySelector(selector);
  return ele.innerText;
}

function getBrowserNextCompletePromise(curTabId) {
  let onUpdate;
  return new Promise((resolve) => {
    onUpdate = (tabId, info) => {
      OspUtil.log("tab onUpdated called called", info);
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
      OspUtil.log("webrequest onCompleted called called", details);
      resolve();
    };
    chrome.webRequest.onCompleted.addListener(onCompleted, { urls: [targetUrl] });
  }).then(() => chrome.webRequest.onCompleted.removeListener(onCompleted));
}

export default class BrExtHelper {
  constructor(curTabId) {
    this.currentTabId = curTabId;
    this.extraWaitTimeMs = 0;
    this.abandoned = false;
  }

  abandonRemainingRequests() {
    this.abandoned = true;
  }

  setExtraWaitTimeMs(timeMS) {
    this.extraWaitTimeMs = timeMS;
  }

  static async getCurrentTab() {
    let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let currTab = tabs[0];
    return currTab;
  }

  static async getCurrentTabId() {
    let currTab = await this.getCurrentTab();
    return currTab.id;
  }

  static async getCurrentTabUrl() {
    let currTab = await this.getCurrentTab();
    return currTab?.url || '';
  }

  async executeFuncInContent(func, argsArray = [], world = 'ISOLATED') {
    if (this.abandoned) {
      OspUtil.log("executeFuncInContent abandoned", func?.name, argsArray, world);
      throw new Error(`executeFuncInContent abandoned ${func?.name}, ${argsArray}, ${world}`);
    }

    OspUtil.log("executeFuncInContent called", func?.name, argsArray, world);
    let ret;
    await chrome.scripting.executeScript({
      target: { tabId: this.currentTabId },
      func: func,
      world: world,
      args: argsArray
    })
      .then(injectionResults => {
        for (const { frameId, result } of injectionResults) {
          if (frameId === 0) {
            OspUtil.log("executeFuncInContent returned", func?.name, argsArray, world, result);
            ret = result;
          }
        }
      });

    return ret;
  }


  async waitForElm(selector) {
    await this.executeFuncInContent(waitForElmInContent, [selector])

    if (extraWaitTimeMs > 0) {
      await OspUtil.sleep(extraWaitTimeMs);
    }
  }

  async clickElm(selector, world = 'ISOLATED') {
    await this.waitForElm(selector);
    await this.executeFuncInContent(clickElmInContent, [selector], world);
  }

  async setElmText(selector, strText) {
    await this.waitForElm(selector);
    await this.executeFuncInContent(setElmTextInContent, [selector, strText]);
  }

  async selectOptionIndex(selector, index) {
    await this.waitForElm(selector);
    await this.executeFuncInContent(selectOptionIndexInContent, [selector, index]);
  }


  async getSelectOptionText(selector) {
    await this.waitForElm(selector);

    const optText = this.executeFuncInContent(getSelectOptionTextInContent, [selector]);
    return optText;
  }

  async getSelectOptionIndex(selector) {
    await this.waitForElm(selector);

    const optIndex = await this.executeFuncInContent(getSelectOptionIndexInContent, [selector]);
    return optIndex;
  }


  async selectOptionByText(selector, optText) {
    await this.waitForElm(selector);

    await this.executeFuncInContent(selectOptionByTextInContent, [selector, optText]);
  }

  async getEleText(selector) {

    await this.waitForElm(selector);

    const eleText = await this.executeFuncInContent(getEleTextInContent, [selector]);
    return eleText;
  }

  async gotoUrl(url) {
    await this.pageAction(async () => chrome.tabs.update(this.currentTabId, { url: url }));
  }

  async pageAction(action) {
    let nextRequestPromise = getBrowserNextCompletePromise(this.currentTabId);
    await action();
    await nextRequestPromise
  }

  async ajaxAction(ajaxTargetUrl, action) {
    let nextRequestPromise = getRequestNextCompletePromise(this.currentTabId, ajaxTargetUrl);
    await action();
    await nextRequestPromise
  }
}

