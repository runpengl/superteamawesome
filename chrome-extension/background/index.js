// Initialization
firebase.initializeApp(config.firebase);
chrome.runtime.onMessage.addListener(handleChromeRuntimeMessage);
chrome.runtime.onConnect.addListener(handleChromeRuntimeConnect);
chrome.tabs.onUpdated.addListener(handleChromeTabsUpdated);
chrome.tabs.onRemoved.addListener(handleChromeTabsRemoved);

function logEvent(event) {
    firebase.database().ref("eventLogs").push(
        Object.assign({}, event, {
            timestampMs: Date.now(),
            userId: firebase.auth().currentUser &&
                firebase.auth().currentUser.uid
        }));
}

function startAuth() {
    var interactive = true;
    chrome.identity.getAuthToken({ interactive: interactive }, function(token) {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            // inform popup somehow
        } else if (token) {
            // Sign in to Firebase with the Google Access Token.
            var credential = firebase.auth.GoogleAuthProvider.credential(null, token);
            firebase.auth().signInWithCredential(credential).then(function(userOrNull) {
                if (!userOrNull) {
                    return;
                }
                var user = userOrNull;
                logEvent({ name: "LoggedIn" });

                // Save info so other clients can display a list of users viewing a puzzle
                firebase.database().ref("users/" + user.uid).set({
                    displayName: user.displayName,
                    email: user.email,
                    photoUrl: user.photoURL
                });

                Slack.connect(interactive);

            }).catch(function(error) {
                console.error("[firebase/auth] Retrying Google auth due to error:", error);
                // The OAuth token might have been invalidated. Let's remove it from cache.
                chrome.identity.removeCachedAuthToken({token: token}, function() {
                    // Try logging into Google from scratch.
                    startAuth();
                });
            });
        } else {
            console.error("The OAuth Token was unexpectedly null.");
        }
    });
}

/**
 * interface ToolbarInfo {
 *     toolbarType: "puzzle" | "hunt",
 *     locationType: "puzzle" | "spreadsheet" | "slack",
 *     puzzleKey?: string,
 *     huntKey?: string;
 *     host?: string;
 *     path?: string;
 *     title?: string;
 * }
 */
var toolbarInfoByTabId = {};

function handleChromeTabsUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === "complete") {
        var a = document.createElement("a");
        a.href = tab.url;

        fetchTabInfoForLocation(a.hostname, a.pathname,
            function(info) {
                if (info.locationType === "spreadsheet" &&
                    toolbarInfoByTabId.hasOwnProperty(tabId) &&
                    toolbarInfoByTabId[tabId].locationType === "spreadsheet" &&
                    info.puzzleKey === toolbarInfoByTabId[tabId].puzzleKey) {
                    // Already displaying appropriate toolbar for puzzle
                    return;
                }
                console.log("[tabs.onUpdate]", tabId, info);
                toolbarInfoByTabId[tabId] = Object.assign(info, {
                    host: a.hostname,
                    path: a.pathname,
                    title: tab.title
                });
                // On single-page apps like slack, the toolbar persists while
                // switching channels, so we need to trigger a reconnection so
                // that the toolbar can subscribe to a different set of data.
                chrome.tabs.sendMessage(tabId, { msg: "refreshConnection" });

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
    if (port.name === "popupLoad") {
        handlePopupConnect(port);
        return;
    }
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
            var puzzlesRef = db.ref("puzzles").orderByChild("hunt").equalTo(toolbarInfo.huntKey);
            var discoveredPageRef = db.ref("discoveredPages/" + toolbarInfo.huntKey)
                .orderByChild("path").equalTo(toolbarInfo.path).limitToFirst(1);

            huntRef.on("value", handleHuntValue);
            puzzlesRef.on("child_added", handlePuzzleAddedValue);
            discoveredPageRef.on("value", handleDiscoveredPageValue);

            port.onDisconnect.addListener(function() {
                huntRef.off("value", handleHuntValue);
                puzzlesRef.off("value", handlePuzzleAddedValue);
                discoveredPageRef.off("value", handleDiscoveredPageValue);
            });

            function handleHuntValue(hunt) {
                port.postMessage({
                    msg: "hunt",
                    data: {
                        hunt: hunt.val(),
                        currentUser: currentUser,
                        location: toolbarInfo.locationType
                    }
                });
            }

            function handlePuzzleAddedValue(p) {
                var puzzlePath = p.val().path;
                if (puzzlePath && toolbarInfo.path.startsWith(puzzlePath)) {
                    toolbarInfoByTabId[tabId] = {
                        toolbarType: "puzzle",
                        locationType: "puzzle",
                        huntKey: toolbarInfo.huntKey,
                        puzzleKey: p.key,
                        slackChannel: p.val().slackChannel
                    };
                    chrome.tabs.sendMessage(tabId, { msg: "refreshConnection" });
                }
            }

            function handleDiscoveredPageValue(snap) {
                // TODO only add discoveredPage if the hunt is current
                if (snap.numChildren() === 0) {
                    console.log("[firebase/discoveredPages]",
                        toolbarInfo.host, toolbarInfo.path, toolbarInfo.title);
                    var pushed = db.ref("discoveredPages/" + toolbarInfo.huntKey).push({
                        host: toolbarInfo.host,
                        path: toolbarInfo.path,
                        title: toolbarInfo.title
                    });
                    logEvent({
                        name: "DiscoveredPageAdded",
                        id: pushed.key
                    });
                } else {
                    snap.forEach(function(dp) {
                        // Monitor and send updates to toolbar
                        port.postMessage({
                            msg: "discoveredPage",
                            data: dp.val()
                        });
                    });
                }
            }
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
                    logEvent({
                        name: "PuzzleViewerAdded",
                        puzzleId: toolbarInfo.puzzleKey,
                        tabId: tabId
                    });
                }
            }

            // This is a hack. When the port disconnects, we should cancel all firebase listeners,
            // but some of the nested queries on users/ are hard to cancel. So we'll just set a flag
            // when the port is disconnected and noop when the queries return.
            var portDisconnected = false;
            function handlePuzzleViewersValue(snap) {
                var changeId = ++currentViewersChangeId;
                var viewers = [];
                var numViewers = snap.numChildren();
                var numUsersFetched = 0;
                snap.forEach(function(viewer) {
                    db.ref("users/" + viewer.key).once("value", function(user) {
                        if (currentViewersChangeId !== changeId || portDisconnected) {
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

            var unsubscribeSlackState = Slack.onConnectStateChanged(
                function(state) {
                    port.postMessage({
                        msg: "slackConnectionStatus",
                        status: state
                    });
                });
            var unsubscribeChannel = Slack.subscribeToChannel(
                tabId, toolbarInfo.slackChannel, function(channel) {
                    port.postMessage({
                        msg: "slackChannel",
                        data: { channel: channel }
                    })
                });

            port.onDisconnect.addListener(function() {
                portDisconnected = true;
                detachPuzzleAndHuntRefs();
                isConnectedRef.off("value", handleConnectedValue);
                viewersRef.off("value", handlePuzzleViewersValue);

                unsubscribeSlackState();
                unsubscribeChannel();

                // Remove self as viewer. Note that this must happen last;
                // Otherwise, the viewersRef will be notified of changes and
                // attempt to post a message on the disconnected port.
                viewRef.remove();

                logEvent({
                    name: "PuzzleViewerRemoved",
                    puzzleId: toolbarInfo.puzzleKey,
                    tabId: tabId
                });
            });
            break;
    }
}

function handlePopupConnect(port) {
    console.log("[chrome.runtime.onConnect]", "popupLoad");
    var db = firebase.database();
    var currentHuntRef = db.ref("currentHunt");
    var viewersRef = db.ref("puzzleViewers");
    var huntRef;
    var puzzlesRef;

    var unsubscribeAuth = firebase.auth().onAuthStateChanged(function(userOrNull) {
        port.postMessage({
            msg: "auth",
            user: userOrNull
        });

        currentHuntRef.on("value", handleCurrentHuntValue, handleCurrentHuntFailure);
        viewersRef.on("value", handleViewersValue);
    });

    var unsubscribeSlackState = Slack.onConnectStateChanged(function(state) {
        port.postMessage({
            msg: "slackConnectionStatus",
            status: state
        });
    });

    port.onDisconnect.addListener(function() {
        unsubscribeAuth();
        unsubscribeSlackState();
        if (huntRef) huntRef.off("value", handleHuntValue);
        if (puzzlesRef) puzzlesRef.off("value", handlePuzzlesValue);
        if (viewersRef) viewersRef.off("value", handleViewersValue);
        if (currentHuntRef) currentHuntRef.off("value", handleCurrentHuntValue);
    });

    function handleCurrentHuntValue(currentHuntSnap) {
        if (huntRef) huntRef.off("value", handleHuntValue);
        if (puzzlesRef) puzzlesRef.off("value", handlePuzzlesValue);
        var currentHuntKey = currentHuntSnap.val();

        huntRef = db.ref("hunts/" + currentHuntKey);
        huntRef.on("value", handleHuntValue);
        puzzlesRef = db.ref("puzzles").orderByChild("hunt").equalTo(currentHuntKey);
        puzzlesRef.on("value", handlePuzzlesValue);
    }
    function handleCurrentHuntFailure(error) {
        if (error.code === "PERMISSION_DENIED") {
            port.postMessage({
                msg: "permissionDenied"
            });
        }
    }
    function handleHuntValue(huntSnap) {
        port.postMessage({
            msg: "hunt",
            hunt: huntSnap.val()
        });
    }
    function handlePuzzlesValue(puzzlesSnap) {
        var puzzles = [];
        puzzlesSnap.forEach(function(puzzle) {
            puzzles.push(Object.assign({}, puzzle.val(), {
                key: puzzle.key
            }))
        });
        puzzles.sort(function(p1, p2) {
            // sort by createdAt descending
            return new Date(p2.createdAt).getTime() -
                new Date(p1.createdAt).getTime();
        });
        port.postMessage({
            msg: "puzzles",
            puzzles: puzzles
        });
    }
    function handleViewersValue(viewersSnap) {
        var puzzleViewers = {};
        viewersSnap.forEach(function(viewersForPuzzle) {
            var numActiveViewers = 0;
            viewersForPuzzle.forEach(function(viewerTabs) {
                viewerTabs.forEach(function(tab) {
                    if (!tab.val().idle) {
                        numActiveViewers++;
                        return true; // stop iterating
                    }
                });
            });
            puzzleViewers[viewersForPuzzle.key] = numActiveViewers;
        });
        port.postMessage({
            msg: "puzzleViewers",
            puzzleViewers: puzzleViewers
        });
    }
}

/**
 * Handles chrome.runtime onMessage events. These messages are sent from either
 * the content script or the toolbar to read (once) or write firebase data.
 */
function handleChromeRuntimeMessage(request, sender, sendResponse) {
    console.log("[runtime.onMessage]", request);

    switch (request.msg) {
        case "authorizeSlack":
            Slack.connect(/*interactive*/true);
            break;
        case "joinChannel":
            Slack.joinChannel(request.name);
            break;
        case "puzzleBacksolved":
            var puzzleKey = toolbarInfoByTabId[sender.tab.id].puzzleKey;
            firebase.database()
                .ref("puzzles/" + puzzleKey + "/wasBacksolved")
                .set(true);
            break;
        case "puzzleSolutionChange":
            var puzzleKey = toolbarInfoByTabId[sender.tab.id].puzzleKey;
            firebase.database()
                .ref("puzzles/" + puzzleKey + "/solution")
                .set(request.solution);
            logEvent({
                name: "PuzzleSolutionChanged",
                puzzleId: puzzleKey,
                solution: request.solution
            });
            break;
        case "puzzleStatusChange":
            var puzzleKey = toolbarInfoByTabId[sender.tab.id].puzzleKey;
            firebase.database()
                .ref("puzzles/" + puzzleKey + "/status")
                .set(request.status);
            firebase.database()
                .ref("puzzles/" + puzzleKey + "/wasBacksolved")
                .set(false);
            logEvent({
                name: "PuzzleStatusChanged",
                puzzleId: puzzleKey,
                status: request.status
            });
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
            logEvent({
                name: request.isIdle
                    ? "PuzzleViewerRemoved"
                    : "PuzzleViewerAdded",
                puzzleId: data.puzzleKey,
                tabId: sender.tab.id
            });
            break;
        case "signIn":
            startAuth();
            break;
        case "signOut":
            logEvent({ name: "LoggedOut" });
            firebase.auth().signOut();
            Slack.disconnect();
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
            puzzleKey: puzzleSnapshot.key,
            slackChannel: puzzleSnapshot.val().slackChannel
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
                "slackChannelId", match[1], function(p) {
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
        // Find hunt that matches current location's hostname
        selectOnlyWhereChildEquals("huntHostNames",
            "hostName", hostname, function(huntHostName) {
                if (!huntHostName) {
                    callback({ toolbarType: "none" });
                    return;
                }
                var huntKey = huntHostName.val().hunt;

                // See if any puzzles in this hunt match the current path
                selectAllWhereChildEquals("puzzles",
                    "hunt", huntKey, function(puzzlesSnapshot) {
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
                                locationType: "huntSite",
                                huntKey: huntKey
                            });
                        }
                    });
            });
    }
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
