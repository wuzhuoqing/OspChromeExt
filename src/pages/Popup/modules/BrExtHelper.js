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

async function waitForElmDisappearInContent(selector) {
  let elePromise = new Promise(resolve => {
    if (!document.querySelector(selector)) {
      return resolve();
    }

    const observer = new MutationObserver(mutations => {
      if (!document.querySelector(selector)) {
        observer.disconnect();
        resolve();
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
  // console.log('clicking', selector);
  let ele = document.querySelector(selector);
  ele.click();
  // console.log('clicked', selector);
  return selector;
}

async function setElmTextInContent(selector, strText) {
  let element = document.querySelector(selector);
  //console.log('setting', selector, element, strText);
  // https://stackoverflow.com/questions/66536154/changing-input-text-of-a-react-app-using-javascript
  const { set: valueSetter } = Object.getOwnPropertyDescriptor(element, 'value') || {};
  const prototype = Object.getPrototypeOf(element);
  const { set: prototypeValueSetter } = Object.getOwnPropertyDescriptor(prototype, 'value') || {};
  //console.log('prepared', 'valueSetter', valueSetter, 'prototypeValueSetter', prototypeValueSetter);

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    //console.log('setting value prototypeValueSetter', selector, element, element.value);
    prototypeValueSetter.call(element, strText)
  } else if (valueSetter) {
    //console.log('setting value valueSetter', selector, element, element.value);
    valueSetter.call(element, strText)
  } else {
    //console.log('setting value natively', selector, element, element.value);
    element.value = strText;
  }

  //
  //element.setAttribute("value", strText);
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('input', { bubbles: true }));
  // console.log('setted', selector, element, strText);
  //console.log('setted value', selector, element, element.value);
  return selector;
}

async function selectOptionIndexInContent(selector, index) {
  let ele = document.querySelector(selector);
  ele.selectedIndex = index;
  ele.dispatchEvent(new Event('change', { bubbles: true }));
  return selector;
}

async function setCheckboxStateInContent(selector, cbState) {
  let element = document.querySelector(selector);
  //console.log('setting', selector, element, cbState);
  // https://stackoverflow.com/questions/66536154/changing-input-text-of-a-react-app-using-javascript
  const { set: valueSetter } = Object.getOwnPropertyDescriptor(element, 'checked') || {};
  const prototype = Object.getPrototypeOf(element);
  const { set: prototypeValueSetter } = Object.getOwnPropertyDescriptor(prototype, 'checked') || {};
  //console.log('prepared', 'valueSetter', valueSetter, 'prototypeValueSetter', prototypeValueSetter);

  const lastValue = element.checked;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    //console.log('setting checked prototypeValueSetter', selector, element, element.checked);
    prototypeValueSetter.call(element, cbState)
  } else if (valueSetter) {
    //console.log('setting checked valueSetter', selector, element, element.checked);
    valueSetter.call(element, cbState)
  } else {
    element.checked = cbState;
    //console.log('setting checked natively', selector, element, element.checked);
  }

  // hack from https://github.com/facebook/react/issues/11488
  // if (element._valueTracker) {
  //   element._valueTracker.setValue(lastValue);
  // }

  //element.setAttribute("checked", cbState);
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('click', { bubbles: true }));
  //console.log('setted checked', selector, element, element.checked);
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
      OspUtil.log("tab onUpdated called", info);
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
      OspUtil.log("webrequest onCompleted called", details);
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

  async waitForElmDisappear(selector) {
    await this.executeFuncInContent(waitForElmDisappearInContent, [selector])

    if (this.extraWaitTimeMs > 0) {
      await OspUtil.sleep(this.extraWaitTimeMs);
    }
  }

  async waitForElm(selector) {
    await this.executeFuncInContent(waitForElmInContent, [selector])

    if (this.extraWaitTimeMs > 0) {
      await OspUtil.sleep(this.extraWaitTimeMs);
    }
  }

  async clickElm(selector, world = 'ISOLATED') {
    await this.waitForElm(selector);
    await this.executeFuncInContent(clickElmInContent, [selector], world);
  }

  async setCheckboxState(selector, cbState, world = 'ISOLATED') {
    await this.waitForElm(selector);
    await this.executeFuncInContent(setCheckboxStateInContent, [selector, cbState], world);
  }

  async setElmText(selector, strText, world = 'ISOLATED') {
    await this.waitForElm(selector);
    await this.executeFuncInContent(setElmTextInContent, [selector, strText], world);
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

