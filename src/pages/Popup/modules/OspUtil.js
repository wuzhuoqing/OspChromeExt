export function strEqualIgnoreCase(str1, str2) {
  return str1.localeCompare(str2, 'en', { sensitivity: 'base' }) === 0;
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dummyLog() {
}

export let log = console.log;
export let error = console.error;

export function enableLog() {
  log = console.log;
}

export function disableLog() {
  log = dummyLog;
}

export function getCurrentLocalDateStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  return formattedTime;
}
export function isNullOrWhiteSpace(input) {
  return !input || !input.trim();
}

// copied from https://javascript.plainenglish.io/how-to-add-a-timeout-limit-to-asynchronous-javascript-functions-3676d89c186d
/**
 * Call an async function with a maximum time limit (in milliseconds) for the timeout
 * @param {Promise<any>} asyncFunc An asynchronous function
 * @param {number} timeLimitInMs Time limit to attempt function in milliseconds
 * @returns {Promise<any> | undefined} Resolved promise for async function call, or an error if time limit reached
 */
export function asyncCallWithTimeout(asyncFunc, timeLimitInMs) {
  let timeoutHandle;

  const timeoutPromise = new Promise((_resolve, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error('Async call timeout limit reached')),
      timeLimitInMs
    );
  });

  return Promise.race([asyncFunc(), timeoutPromise]).then(result => {
    clearTimeout(timeoutHandle);
    return result;
  })
}

export function extractNumberFromString(str) {
  const regex = /(\d+)/g;
  const matches = str.match(regex);
  if (matches) {
    return parseInt(matches[0]);
  }
  return -1;
}

export function getHost(urlStr) {
  if (URL.canParse(urlStr)) {
    const url = new URL(urlStr);
    return url.host;
  } else {
    return '';
  }
}

export function extractFloat(str) {
  const ret = parseFloat(str);
  if (isNaN(ret)) {
    return -1;
  }
  return ret;
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

export function getStateCode(stateName) {
  if (!stateName) {
    return '??';
  }

  stateName = stateName.trim();
  if (stateName.length === 2) {
    return stateName;
  }

  let stateList = [
    { name: "Alabama", abbreviation: "AL" },
    { name: "Alaska", abbreviation: "AK" },
    { name: "Arizona", abbreviation: "AZ" },
    { name: "Arkansas", abbreviation: "AR" },
    { name: "California", abbreviation: "CA" },
    { name: "Colorado", abbreviation: "CO" },
    { name: "Connecticut", abbreviation: "CT" },
    { name: "Delaware", abbreviation: "DE" },
    { name: "Florida", abbreviation: "FL" },
    { name: "Georgia", abbreviation: "GA" },
    { name: "Hawaii", abbreviation: "HI" },
    { name: "Idaho", abbreviation: "ID" },
    { name: "Illinois", abbreviation: "IL" },
    { name: "Indiana", abbreviation: "IN" },
    { name: "Iowa", abbreviation: "IA" },
    { name: "Kansas", abbreviation: "KS" },
    { name: "Kentucky", abbreviation: "KY" },
    { name: "Louisiana", abbreviation: "LA" },
    { name: "Maine", abbreviation: "ME" },
    { name: "Maryland", abbreviation: "MD" },
    { name: "Massachusetts", abbreviation: "MA" },
    { name: "Michigan", abbreviation: "MI" },
    { name: "Minnesota", abbreviation: "MN" },
    { name: "Mississippi", abbreviation: "MS" },
    { name: "Missouri", abbreviation: "MO" },
    { name: "Montana", abbreviation: "MT" },
    { name: "Nebraska", abbreviation: "NE" },
    { name: "Nevada", abbreviation: "NV" },
    { name: "New Hampshire", abbreviation: "NH" },
    { name: "New Jersey", abbreviation: "NJ" },
    { name: "New Mexico", abbreviation: "NM" },
    { name: "New York", abbreviation: "NY" },
    { name: "North Carolina", abbreviation: "NC" },
    { name: "North Dakota", abbreviation: "ND" },
    { name: "Ohio", abbreviation: "OH" },
    { name: "Oklahoma", abbreviation: "OK" },
    { name: "Oregon", abbreviation: "OR" },
    { name: "Pennsylvania", abbreviation: "PA" },
    { name: "Rhode Island", abbreviation: "RI" },
    { name: "South Carolina", abbreviation: "SC" },
    { name: "South Dakota", abbreviation: "SD" },
    { name: "Tennessee", abbreviation: "TN" },
    { name: "Texas", abbreviation: "TX" },
    { name: "Utah", abbreviation: "UT" },
    { name: "Vermont", abbreviation: "VT" },
    { name: "Virginia", abbreviation: "VA" },
    { name: "Washington", abbreviation: "WA" },
    { name: "West Virginia", abbreviation: "WV" },
    { name: "Wisconsin", abbreviation: "WI" },
    { name: "Wyoming", abbreviation: "WY" }
  ];

  let stateCode = stateList.find(state => strEqualIgnoreCase(state.name, stateName))?.abbreviation;
  return stateCode || '??';
}