// Initialization
firebase.initializeApp(config.firebase);
firebase.auth().onAuthStateChanged(handleFirebaseAuthStateChange);
chrome.runtime.onMessage.addListener(handleChromeRuntimeMessage);
chrome.runtime.onConnect.addListener(handleChromeRuntimeConnect);

// Keep this data synced for faster toolbar initialization
firebase.database().ref("hunts").on("value", function() {});

function handleFirebaseAuthStateChange(user) {
    // Save info so other clients can display a list of users viewing a puzzle
    firebase.database().ref("users/" + user.uid).set({
        displayName: user.displayName,
        photoUrl: user.photoURL
    });
}

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

    var currentUser = firebase.auth().currentUser;
    var data = toolbarData[tabId];
    switch (data.type) {
        case "general":
            break;

        case "hunt":
            break;

        case "puzzle":
            var db = firebase.database();
            var puzzleRef = db.ref("puzzles/" + data.puzzleKey);
            var huntRef = db.ref("hunts/" + data.huntKey);

            onValue2(puzzleRef, huntRef, function(puzzle, hunt) {
                port.postMessage({
                    msg: "puzzle",
                    data: {
                        hunt: hunt.val(),
                        puzzle: puzzle.val(),
                        currentUser: currentUser,
                        location: data.location
                    }
                });
            });

            var viewRef = db.ref("puzzleViewers").child(data.puzzleKey)
                .child(currentUser.uid).child(tabId);
            var isConnectedRef = db.ref(".info/connected");
            isConnectedRef.on("value", function(snap) {
                if (snap.val()) {
                    // When firebase is next disconnected, remove self as viewer
                    viewRef.onDisconnect().remove();
                    // Add currentUser as a viewer of the puzzle
                    viewRef.set({
                        tabHidden: false,
                        idle: false
                    });
                }
            });

            var currentViewersChangeId = 0;
            var viewersRef = db.ref("puzzleViewers/" + data.puzzleKey);
            viewersRef.on("value", function(snap) {
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
            });

            port.onDisconnect.addListener(function() {
                puzzleRef.off();
                huntRef.off();
                isConnectedRef.off();
                viewersRef.off();

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
        case "contentScriptLoad":
            return handleContentScriptLoadMessage(
                request, sender, sendResponse);
        case "puzzleStatusChange":
            firebase.database()
                .ref("puzzles/" + toolbarData[sender.tab.id].puzzleKey + "/status")
                .set(request.status);
            break;
        case "pageVisibilityChange":
            var data = toolbarData[sender.tab.id];
            var currentUserId = firebase.auth().currentUser.uid;
            firebase.database()
                .ref("puzzleViewers").child(data.puzzleKey)
                .child(currentUserId).child(sender.tab.id)
                .child("tabHidden").set(request.isHidden);
            break;
        case "idleStatusChange":
            var data = toolbarData[sender.tab.id];
            var currentUserId = firebase.auth().currentUser.uid;
            firebase.database()
                .ref("puzzleViewers").child(data.puzzleKey)
                .child(currentUserId).child(sender.tab.id)
                .child("idle").set(request.isIdle);
            break;
    }
}

/**
 * Handles the `content_script_load` message. Given the location data
 * sent by the content script, determines if a toolbar should be injected
 * onto the page.
 */
function handleContentScriptLoadMessage(request, sender, sendResponse) {
    var alreadySent = false;
    function maybeInitToolbar(data) {
        if (alreadySent) return;
        toolbarData[sender.tab.id] = data;
        sendResponse({ msg: "initToolbar" });
        alreadySent = true;
    }
    var hostname = request.location.hostname;
    var pathname = request.location.pathname;
    if (hostname === "docs.google.com") {
        // Attempt to find puzzle by spreadsheetId
        var match = pathname.match(
            /\/spreadsheets\/d\/([^\/?]+)/);
        if (match) {
            firebase.database().ref("puzzles")
                .orderByChild("spreadsheetId")
                .equalTo(match[1])
                .limitToFirst(1)
                .once("value", function(puzzleSnapshot) {
                    puzzleSnapshot.forEach(function (puzzle) {
                        maybeInitToolbar({
                            type: "puzzle",
                            location: "spreadsheet",
                            huntKey: puzzle.val().hunt,
                            puzzleKey: puzzle.key
                        });
                    });
                });
        }
    } else if (
        hostname === "superteamawesome.slack.com" ||
        (hostname.endsWith("web.mit.edu") && pathname.startsWith("/puzzle")) ||
        (hostname.endsWith("mit.edu") && pathname.startsWith("/~puzzle"))
    ) {
        maybeInitToolbar({ type: "general" });
    } else {
        // First, attempt to match to a hunt domain
        firebase.database().ref("hunts").once("value", function(hunts) {
            hunts.forEach(function(hunt) {
                var huntDomain = hunt.val().domain;
                if (huntDomain && hostname.endsWith(huntDomain)) {
                    // Then, try to find a matching puzzle within this hunt
                    firebase.database().ref("puzzles")
                        .orderByChild("hunt")
                        .equalTo(hunt.key)
                        .once("value", function(puzzles) {
                            var puzzleFound = puzzles.forEach(function(puzzle) {
                                var puzzlePath = puzzle.val().path;
                                if (puzzlePath && pathname.startsWith(puzzlePath)) {
                                    maybeInitToolbar({
                                        type: "puzzle",
                                        location: "puzzle",
                                        huntKey: hunt.key,
                                        puzzleKey: puzzle.key
                                    });
                                    return true;
                                }
                            });
                            if (puzzleFound) {
                                return;
                            }
                            // No puzzle matched; initialize toolbar for hunt
                            maybeInitToolbar({
                                type: "hunt",
                                huntKey: hunt.key
                            });

                            if (hunt.val().isCurrent) {
                                // If hunt is current, try and add a discoveredPage for it
                                var pagesRef = firebase.database().ref("discoveredPages/" + hunt.key);
                                pagesRef.orderByChild("path").equalTo(pathname)
                                    .once("value", function(snap) {
                                        if (!snap.numChildren()) {
                                            // Page not found; add one
                                            pagesRef.push({
                                                host: hunt.val().domain,
                                                path: pathname,
                                                title: request.title
                                            });
                                        }
                                    });
                            }
                        });
                }
            });
        });
    }

    // sendResponse will be called asynchronously
    return true;
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
