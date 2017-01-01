// Initialization
firebase.initializeApp(config.firebase);
chrome.runtime.onMessage.addListener(handleChromeRuntimeMessage);
chrome.runtime.onConnect.addListener(handleChromeRuntimeConnect);

function noop() {}
// Keep this data synced for faster toolbar initialization
firebase.database().ref("chromeExtensionConfig").on("value", noop);
firebase.database().ref("hunts").on("value", noop);

var toolbarData = {};

/**
 * Handles chrome.runtime onConnect events. Toolbars injected onto a page
 * will open a connection to request data from the background script.
 */
function handleChromeRuntimeConnect(port) {
    var tabId = port.sender.tab.id;
    port.onDisconnect.addListener(function() {
        delete toolbarData[tabId];
    });

    var tabLocation = toolbarData[tabId].location;
    if (tabLocation.hostname === "docs.google.com") {
        var match = tabLocation.pathname.match(
            /\/spreadsheets\/d\/([^\/?]+)/);
        if (match) {
            firebase.database().ref("puzzles")
                .orderByChild("spreadsheet_id")
                .equalTo(match[1])
                .limitToFirst(1)
                .once("value", function(puzzleSnapshot) {
                    puzzleSnapshot.forEach(function(puzzle) {
                        var puzzleData = puzzle.val();
                        huntByKeyOnce(puzzleData.hunt, function(hunt) {
                            port.postMessage({
                                msg: "puzzle",
                                data: {
                                    currentUser: firebase.auth().currentUser,
                                    puzzleKey: puzzle.key,
                                    puzzle: puzzle.val(),
                                    hunt: hunt
                                }
                            });
                        });
                    });
                });
        }
    }
}

/**
 * Handles chrome.runtime onMessage events. Typically these messages are
 * sent from the content script injected on each page.
 */
function handleChromeRuntimeMessage(request, sender, sendResponse) {
    switch (request.msg) {
        case "contentScriptLoad":
            return handleContentScriptLoadMessage(
                request, sender, sendResponse);
    }
}

/**
 * Handles the `content_script_load` message. Given the location data
 * sent by the content script, determines if a toolbar should be injected
 * onto the page.
 */
function handleContentScriptLoadMessage(request, sender, sendResponse) {
    var alreadySent = false;
    function maybeInitToolbar() {
        if (alreadySent) return;
        toolbarData[sender.tab.id] = {
            location: request.location
        };
        sendResponse({ msg: "initToolbar" });
        alreadySent = true;
    }
    firebase.database().ref("chromeExtensionConfig/toolbarFilters")
        .once("value", function(filters) {
            var hostname = request.location.hostname;
            var pathname = request.location.pathname;
            filters.forEach(function(filter) {
                var hostSuffixFilter = filter.val().hostSuffix;
                var pathPrefixFilter = filter.val().pathPrefix;
                var satisfiesHostFilter = !hostSuffixFilter || hostname.endsWith(hostSuffixFilter);
                var satisfiesPathFilter = !pathPrefixFilter || pathname.startsWith(pathPrefixFilter);
                if (satisfiesHostFilter && satisfiesPathFilter) {
                    maybeInitToolbar();
                }
            });
        });
    firebase.database().ref("hunts")
        .once("value", function(hunts) {
            var hostname = request.location.hostname;
            hunts.forEach(function(hunt) {
                var huntDomain = hunt.val().domain;
                if (huntDomain && hostname.endsWith(huntDomain)) {
                    maybeInitToolbar();
                }
            });
        });

    // sendResponse will be called asynchronously
    return true;
}

//
// Firebase Query Helpers
// ----------------------------------------------------------------------------

function huntByKeyOnce(huntKey, callback) {
    firebase.database().ref("hunts/" + huntKey).once("value", function(snapshot) {
        callback(snapshot.val());
    });
}
