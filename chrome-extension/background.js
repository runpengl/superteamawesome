// Initialization
firebase.initializeApp(config.firebase);
firebase.auth().onAuthStateChanged(handleFirebaseAuthStateChange);
chrome.runtime.onMessage.addListener(handleChromeRuntimeMessage);
chrome.runtime.onConnect.addListener(handleChromeRuntimeConnect);
chrome.tabs.onUpdated.addListener(handleChromeTabsUpdated);
chrome.tabs.onRemoved.addListener(handleChromeTabsRemoved);

// Keep this data synced for faster toolbar initialization
firebase.database().ref("hunts").on("value", function() {});

function handleFirebaseAuthStateChange(user) {
    if (!user) {
        return;
    }
    // Save info so other clients can display a list of users viewing a puzzle
    firebase.database().ref("users/" + user.uid).set({
        displayName: user.displayName,
        photoUrl: user.photoURL
    });
}

/**
 * interface ToolbarInfo {
 *     toolbarType: "puzzle" | "hunt",
 *     locationType: "puzzle" | "spreadsheet" | "slack",
 *     puzzleKey?: string,
 *     huntKey?: string;
 * }
 */
var toolbarInfoByTabId = {};

function isToolbarInfoEqual(info1, info2) {
    return info1.toolbarType === info2.toolbarType &&
        info1.locationType === info2.locationType &&
        info1.puzzleKey === info2.puzzleKey &&
        info1.huntKey === info2.huntKey;
}

function handleChromeTabsUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === "loading") {
        var a = document.createElement("a");
        a.href = tab.url;

        fetchTabInfoForLocation(a.hostname, a.pathname,
            function(info) {
                if (!toolbarInfoByTabId[tabId] ||
                    !isToolbarInfoEqual(toolbarInfoByTabId[tabId], info)) {

                    console.log(tabId, info);
                    toolbarInfoByTabId[tabId] = info;
                    // On single-page apps like slack, the toolbar persists while
                    // switching channels, so we need to trigger a reconnection so
                    // that the toolbar can subscribe to a different set of data.
                    chrome.tabs.sendMessage(tabId, { msg: "refreshConnection" });

                    if (info.toolbarType === "hunt" &&
                        info.locationType === "huntDomain") {
                        maybeAddDiscoveredPage(info.huntKey, a.pathname, tab.title);
                    }
                }
                if (info.toolbarType !== "none") {
                    // Try and inject a toolbar onto the page. If we have previously
                    // injected a toolbar this is a noop.
                    chrome.tabs.executeScript(tabId, { file: "inject_toolbar.js" });
                }
            });
    }
}

function handleChromeTabsRemoved(tabId, removeInfo) {
    delete toolbarInfoByTabId[tabId];
}

/**
 * Handles chrome.runtime onConnect events. Toolbars injected onto a page
 * will open a connection to request data from the background script.
 */
function handleChromeRuntimeConnect(port) {
    var tabId = port.sender.tab.id;

    var db = firebase.database();
    var currentUser = firebase.auth().currentUser;
    var toolbarInfo = toolbarInfoByTabId[tabId];

    switch (toolbarInfo.toolbarType) {
        case "general":
            port.postMessage({
                msg: "refresh"
            });
            break;

        case "hunt":
            var huntRef = db.ref("hunts/" + toolbarInfo.huntKey);
            huntRef.on("value", function(hunt) {
                port.postMessage({
                    msg: "hunt",
                    data: {
                        hunt: hunt.val(),
                        currentUser: currentUser,
                        location: toolbarInfo.locationType
                    }
                });
            });
            break;

        case "puzzle":
            var puzzleRef = db.ref("puzzles/" + toolbarInfo.puzzleKey);
            var huntRef = db.ref("hunts/" + toolbarInfo.huntKey);

            var detachPuzzleAndHuntRefs = onValue2(puzzleRef, huntRef, function(puzzle, hunt) {
                port.postMessage({
                    msg: "puzzle",
                    data: {
                        hunt: hunt.val(),
                        puzzle: puzzle.val(),
                        currentUser: currentUser,
                        location: toolbarInfo.locationType
                    }
                });
            });

            function handleConnectedValue(snap) {
                if (snap.val()) {
                    // When firebase is next disconnected, remove self as viewer
                    viewRef.onDisconnect().remove();
                    // Add currentUser as a viewer of the puzzle
                    viewRef.set({
                        tabHidden: false,
                        idle: false
                    });
                }
            }

            function handlePuzzleViewersValue(snap) {
                var changeId = ++currentViewersChangeId;
                var viewers = [];
                var numViewers = snap.numChildren();
                var numUsersFetched = 0;
                snap.forEach(function(viewer) {
                    db.ref("users/" + viewer.key).once("value", function(user) {
                        if (currentViewersChangeId !== changeId) {
                            return;
                        }
                        var allTabsHidden = true;
                        var allTabsIdle = true;
                        viewer.forEach(function(client) {
                            allTabsHidden = allTabsHidden && client.val().tabHidden;
                            allTabsIdle = allTabsIdle && client.val().idle;
                        });
                        viewers.push({
                            id: user.key,
                            displayName: user.val().displayName,
                            photoUrl: user.val().photoUrl,
                            isIdle: allTabsIdle,
                            isPuzzleVisible: !allTabsHidden
                        });
                        if (++numUsersFetched === numViewers) {
                            port.postMessage({
                                msg: "puzzleViewers",
                                data: { viewers: viewers }
                            });
                        }
                    });
                });
            }

            var viewRef = db.ref("puzzleViewers").child(toolbarInfo.puzzleKey)
                .child(currentUser.uid).child(tabId);
            var isConnectedRef = db.ref(".info/connected");
            isConnectedRef.on("value", handleConnectedValue);

            var currentViewersChangeId = 0;
            var viewersRef = db.ref("puzzleViewers/" + toolbarInfo.puzzleKey);
            viewersRef.on("value", handlePuzzleViewersValue);

            port.onDisconnect.addListener(function() {
                detachPuzzleAndHuntRefs();
                isConnectedRef.off("value", handleConnectedValue);
                viewersRef.off("value", handlePuzzleViewersValue);

                // Remove self as viewer. Note that this must happen last;
                // Otherwise, the viewersRef will be notified of changes and
                // attempt to post a message on the disconnected port.
                viewRef.remove();
            });
            break;
    }
}

/**
 * Handles chrome.runtime onMessage events. These messages are sent from either
 * the content script or the toolbar to read (once) or write firebase data.
 */
function handleChromeRuntimeMessage(request, sender, sendResponse) {
    switch (request.msg) {
        case "puzzleStatusChange":
            firebase.database()
                .ref("puzzles/" + toolbarInfoByTabId[sender.tab.id].puzzleKey + "/status")
                .set(request.status);
            break;
        case "pageVisibilityChange":
            var data = toolbarInfoByTabId[sender.tab.id];
            if (!(data && data.puzzleKey)) {
                return;
            }
            var currentUserId = firebase.auth().currentUser.uid;
            firebase.database()
                .ref("puzzleViewers").child(data.puzzleKey)
                .child(currentUserId).child(sender.tab.id)
                .child("tabHidden").set(request.isHidden);
            break;
        case "idleStatusChange":
            var data = toolbarInfoByTabId[sender.tab.id];
            if (!(data && data.puzzleKey)) {
                return;
            }
            var currentUserId = firebase.auth().currentUser.uid;
            firebase.database()
                .ref("puzzleViewers").child(data.puzzleKey)
                .child(currentUserId).child(sender.tab.id)
                .child("idle").set(request.isIdle);
            break;
    }
}

/**
 * For a given hostname/pathname, finds a matching hunt (and possibly a matching
 * puzzle), then calls the given callback with toolbar initialization data.
 * @param hostname eg. `docs.google.com`
 * @param pathname eg. `/spreadsheets/d/1234`
 * @param callback with `tabInfo` argument
 */
function fetchTabInfoForLocation(hostname, pathname, callback) {
    function foundPuzzle(puzzleSnapshot, locationType) {
        callback({
            toolbarType: "puzzle",
            locationType: locationType,
            huntKey: puzzleSnapshot.val().hunt,
            puzzleKey: puzzleSnapshot.key
        });
    }
    if (hostname === "docs.google.com") {
        var match = pathname.match(/\/spreadsheets\/d\/([^\/?]+)/);
        if (match) {
            selectOnlyWhereChildEquals("puzzles",
                "spreadsheetId", match[1], function(p) {
                    if (p) {
                        foundPuzzle(p, "spreadsheet");
                    } else {
                        callback({ toolbarType: "none" });
                    }
                });
        }
    } else if (hostname === "superteamawesome.slack.com") {
        var match = pathname.match(/\/messages\/([^\/?]+)/);
        if (match) {
            selectOnlyWhereChildEquals("puzzles",
                "slackChannel", match[1], function(p) {
                    if (p) {
                        foundPuzzle(p, "slack");
                    } else {
                        // Always display hunt toolbar in STA.slack subdomain
                        // TODO: get current hunt and display that?
                        callback({ toolbarType: "general" });
                    }
                });
        }
    } else {
        var domain = hostname.split(".").slice(-2).join(".");

        // Find hunt that matches current domain
        selectOnlyWhereChildEquals("hunts",
            "domain", domain, function(huntSnapshot) {
                if (!huntSnapshot) {
                    callback({ toolbarType: "none" });
                    return;
                }

                // See if any puzzles in this hunt match the current path
                selectAllWhereChildEquals("puzzles",
                    "hunt", huntSnapshot.key, function(puzzlesSnapshot) {
                        var didFindPuzzle = puzzlesSnapshot.forEach(function(p) {
                            var puzzlePath = p.val().path;
                            if (puzzlePath && pathname.startsWith(puzzlePath)) {
                                foundPuzzle(p, "puzzle");
                                return true; // stop forEach iteration
                            }
                        });
                        if (!didFindPuzzle) {
                            callback({
                                toolbarType: "hunt",
                                locationType: "huntDomain",
                                huntKey: huntSnapshot.key
                            });
                        }
                    });
            });
    }
}

/**
 * This function should be called when a page is identified as belonging to a hunt
 * domain but a corresponding puzzle was not found.
 */
function maybeAddDiscoveredPage(huntKey, path, title) {
    var db = firebase.database();
    db.ref("hunts/" + huntKey).once("value", function(hunt) {
        if (!hunt.val().isCurrent) {
            return;
        }
        // If hunt is current, try and add a discoveredPage for it
        selectOnlyWhereChildEquals("discoveredPages/" + hunt.key,
            "path", path, function(snap) {
                if (!snap) {
                    // Page not found; add one
                    db.ref("discoveredPages/" + hunt.key).push({
                        host: hunt.val().domain,
                        path: path,
                        title: title
                    });
                }
            });
    });
}

//
// Firebase Query Helpers
// ----------------------------------------------------------------------------

/**
 * Takes two firebase refs and attaches `value` event listeners on them, calling
 * the given callback when both are resolved and for every update after. The caller
 * is responsible for calling the returned detach function.
 */
function onValue2(ref1, ref2, callback) {
    var snap1 = null;
    var snap2 = null;
    function update() {
        if (snap1 && snap1.val() &&
            snap2 && snap2.val()) {
            callback(snap1, snap2);
        }
    }
    function on1(snap) { snap1 = snap; update(); }
    function on2(snap) { snap2 = snap; update(); }
    ref1.on("value", on1);
    ref2.on("value", on2);

    return function detach() {
        ref1.off("value", on1);
        ref2.off("value", on2);
    };
}

function selectAllWhereChildEquals(path, childKey, childValue, callback) {
    firebase.database().ref(path)
        .orderByChild(childKey)
        .equalTo(childValue)
        .once("value", callback);
}

function selectOnlyWhereChildEquals(path, childKey, childValue, callback) {
    firebase.database().ref(path)
        .orderByChild(childKey)
        .equalTo(childValue)
        .limitToFirst(1)
        .once("value", function(snapshot) {
            if (snapshot.numChildren()) {
                snapshot.forEach(function(puzzle) {
                    callback(puzzle);
                });
            } else {
                callback(null);
            }
        });
}
