let activeSite;
let startTime;
let lastFocusedWindowId;
let initialState = {
  _blacklist: [
    "chrome://",
    "about:blank",
    "chrome-extension://",
    "localhost",
    "chrome-devtools",
    "mailto:",
    "file://"
  ]
};

// TODO: change the data structure so we can store more data about the active site

function checkForLocalStorage() {
  // Set initial state in localstorage
  if (!localStorage.getItem("populate")) {
    localStorage.setItem("populate", JSON.stringify(initialState));
  }
}

/* LISTEN FOR NEW ACTIVE TABS */
chrome.tabs.onActivated.addListener(handleNewSite);

/* LISTEN FOR CHANGE OF BASE URL */
chrome.webNavigation.onCommitted.addListener(handleNewSite);

/* LISTEN FOR WINDOW FOCUS */
chrome.windows.onFocusChanged.addListener(handleNewWindow);

function handleNewSite(incomingSite) {
  checkForLocalStorage();
  let incomingSiteId = incomingSite.tabId || incomingSite.id;
  // query for more info about the new tab (like URL),
  // since `newTab` only gives us a tab & window id
  chrome.tabs.get(incomingSiteId, function(newSite) {
    if (!newSite) return;
    // if we have an active site already and that active site url is different
    // than the new tab's url, we need to set the end time for the previous site
    // and save the timing to local storage
    if (activeSite && getBaseUrl(newSite.url) !== getBaseUrl(activeSite.url)) {
      saveToLocalStorage();
      validateAndSetNewActiveSiteAndStartTime(newSite);
    } else if (!activeSite) {
      validateAndSetNewActiveSiteAndStartTime(newSite);
    }
  });
}

function handleNewWindow(newWindowId) {
  checkForLocalStorage();
  // If the chrome window looses focus, we want to stop counting and save the current timing.
  // newWindowId is an integer, so we can tell if a window has lost focus if it returns -1.
  if (activeSite && newWindowId < 0) {
    saveToLocalStorage();
    clearActiveSiteAndStartTime();
  } else if (newWindowId > 0) {
    // If we've brought a different window into focus, we should query for the currently selected
    //  tab in that new window and call our new site handler
    chrome.tabs.getSelected(newWindowId, function(newTab) {
      if (!newTab) return;
      handleNewSite(newTab);
    });
  }
}

function clearActiveSiteAndStartTime() {
  activeSite = null;
  startTime = null;
}

function validateNewSite(newSite) {
  if (newSite.transitionType) {
    let isTransitionValid =
      newSite.transitionType === "link" ||
      newSite.transitionType === "typed" ||
      newSite.transitionType === "auto_bookmark" ||
      newSite.transitionType === "generated" ||
      newSite.transitionType === "start_page" ||
      newSite.transitionType === "reload";
    // if the transition isn't valid, don't bother with the rest of the
    // validation and return
    if (!isTransitionValid) return false;
  }
  // get blacklist from localstorage
  let blacklist = JSON.parse(localStorage.getItem("populate"))._blacklist;

  let isSiteValid = blacklist.every(site => !newSite.url.includes(site));

  return isSiteValid;
}

function saveToLocalStorage() {
  let endTime = Date.now();
  let currentState = JSON.parse(localStorage.getItem("populate"));
  let localStorageVal = currentState[getBaseUrl(activeSite.url)];
  if (localStorageVal) {
    currentState[getBaseUrl(activeSite.url)] =
      localStorageVal + (endTime - startTime);
  } else {
    currentState[getBaseUrl(activeSite.url)] = endTime - startTime;
  }
  console.log("Saving to local storage", "current active site:");
  localStorage.setItem("populate", JSON.stringify(currentState));
}

function validateAndSetNewActiveSiteAndStartTime(newSite) {
  let newSiteIsValid = validateNewSite(newSite);
  if (newSiteIsValid) {
    activeSite = newSite;
    startTime = Date.now();
  } else {
    clearActiveSiteAndStartTime();
  }
}

function getBaseUrl(url) {
  var temp = document.createElement("a");
  temp.href = url;
  return temp.origin + "/";
}
