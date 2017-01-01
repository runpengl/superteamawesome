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

            var puzzleData = null;
            var huntData = null;
            function update() {
                if (puzzleData && huntData) {
                    port.postMessage({
                        msg: "puzzle",
                        data: {
                            currentUser: firebase.auth().currentUser,
                            puzzle: puzzleData,
                            hunt: huntData
                        }
                    });
                }
            }
            function onPuzzle(puzzle) { puzzleData = puzzle.val(); update(); }
            function onHunt(hunt) { huntData = hunt.val(); update(); }
            puzzleRef.on("value", onPuzzle);
            huntRef.on("value", onHunt);
            port.onDisconnect.addListener(function() {
                puzzleRef.off("value", onPuzzle);
                huntRef.off("value", onHunt);
            });
            break;
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
                            puzzles.forEach(function(puzzle) {
                                var puzzlePath = puzzle.val().path;
                                if (puzzlePath && pathname.startsWith(puzzlePath)) {
                                    maybeInitToolbar({
                                        type: "puzzle",
                                        huntKey: hunt.key,
                                        puzzleKey: puzzle.key
                                    });
                                }
                            });
                            // If no puzzle has matched; fall back to displaying a
                            // toolbar for the given hunt.
                            maybeInitToolbar({
                                type: "hunt",
                                huntKey: hunt.key
                            });
                        });
                }
            });
        });
    }

    // sendResponse will be called asynchronously
    return true;
}
