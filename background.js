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
    // if we have an active site already and that active site url is different
    // than the new tab's url, we need to set the end time for the previous site
    // and save the timing to local storage
    if (activeSite && getBaseUrl(newSite.url) !== getBaseUrl(activeSite.url)) {
      console.log(
        "there is already an active site, and the new site is different"
      );
      saveToLocalStorage();
      validateAndSetNewActiveSiteAndStartTime(newSite);
    } else if (!activeSite) {
      console.warn("handleNewSite => no active site");
      validateAndSetNewActiveSiteAndStartTime(newSite);
    }
  });
}

function handleNewWindow(newWindowId) {
  console.log("in handle new window");
  checkForLocalStorage();
  // If the chrome window looses focus, we want to stop counting and save the current timing.
  // newWindowId is an integer, so we can tell if a window has lost focus if it returns -1.
  if (activeSite && newWindowId < 0) {
    console.log(
      `there is an active site: ${
        activeSite.url
      }, and chrome has gone out of focus`
    );
    saveToLocalStorage();
  } else if (newWindowId > 0) {
    console.log("there is a new window in focus, querying for new tab data");
    // If we've brought a different window into focus, we should query for the currently selected
    //  tab in that new window and call our new site handler
    chrome.tabs.getSelected(newWindowId, function(newTab) {
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
  console.log(
    `incrementing entry for ${getBaseUrl(activeSite.url)} in local storage`
  );
  localStorage.setItem("populate", JSON.stringify(currentState));
}

function validateAndSetNewActiveSiteAndStartTime(newSite) {
  let newSiteIsValid = validateNewSite(newSite);
  if (newSiteIsValid) {
    console.log(
      `the new site, ${
        newSite.url
      } is valid, setting new active site: ${newSite && newSite.url}`
    );
    activeSite = newSite;
    startTime = Date.now();
  } else {
    console.warn(
      `the new site,  ${newSite.url} isn't valid, clearing active site`
    );
    clearActiveSiteAndStartTime();
  }
}

function getBaseUrl(url) {
  var temp = document.createElement("a");
  temp.href = url;
  return temp.origin + "/";
}
