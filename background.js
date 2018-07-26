let activeSite;
let startTime;
let initialState = {
  _blacklist: [
    "chrome://",
    "about:blank",
    "chrome-extension://",
    "localhost",
    "chrome-devtools",
    "mailto:"
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
chrome.tabs.onActivated.addListener(newTab => {
  checkForLocalStorage();
  // if we have an active site already and that active site url is different
  // than the new tab's url, we need to set the end time for the previous site
  // and save the timing to local storage
  if (activeSite && getBaseUrl(activeSite.url) !== getBaseUrl(newTab.url)) {
    saveToLocalStorage();
  }

  // TODO: if the new active tab site is the same as the old, shouldn't we skip the next bit?

  // query for more info about the new tab (like URL),
  // since it only gives us a tab & window id
  chrome.tabs.get(newTab.tabId, function(newSite) {
    let newSiteIsValid = validateNewSite(newSite);
    if (newSiteIsValid) {
      setNewActiveSiteAndStartTime(newSite);
    } else {
      clearActiveSiteAndStartTime();
    }
  });
});

/* LISTEN FOR CHANGE OF BASE URL */
chrome.webNavigation.onCommitted.addListener(newSite => {
  checkForLocalStorage();
  let newSiteIsValid = validateNewSite(newSite);
  if (newSiteIsValid) {
    if (activeSite && getBaseUrl(newSite.url) !== getBaseUrl(activeSite.url)) {
      saveToLocalStorage();
    }
    setNewActiveSiteAndStartTime(newSite);
  }
});

/* LISTEN FOR WINDOW FOCUS */
chrome.windows.onFocusChanged.addListener(newWindow => {
  checkForLocalStorage();
  // if the chrome window looses focus, we want to stop counting and save the current timing.
  // newWindow is an integer, so we can tell if a window has lost focus if it returns -1
  // if it's not, that means we've brought the window back into focus so we should start
  // incrementing time again
  if (activeSite && newWindow < 0) {
    saveToLocalStorage();
  } else {
    // TODO: write condition for changing windows, check that activeSite is the same
    startTime = Date.now();
  }
});

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
  console.log("incrementing entry in local storage");
  localStorage.setItem("populate", JSON.stringify(currentState));
}

function setNewActiveSiteAndStartTime(newSite) {
  activeSite = newSite;
  startTime = Date.now();
}

function getBaseUrl(url) {
  var temp = document.createElement("a");
  temp.href = url;
  return temp.origin + "/";
}
