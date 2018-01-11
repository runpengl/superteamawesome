import * as firebase from "firebase";

import * as ChatWidgetState from "./ChatWidgetState";
import * as ConnectionManager from "./ConnectionManager";
import config from "./config";
import { selectAllWhereChildEquals, selectOnlyWhereChildEquals } from "./FirebaseHelpers";
import * as MessageController from "./MessageController";
import toolbarInfoByTabId from "./toolbarInfoByTabId";

// Initialization
firebase.initializeApp(config.firebase);
chrome.runtime.onMessage.addListener(MessageController.handleRuntimeMessage);
chrome.runtime.onConnect.addListener(ConnectionManager.handleRuntimeConnect);
chrome.tabs.onUpdated.addListener(handleChromeTabsUpdated);
chrome.tabs.onRemoved.addListener(handleChromeTabsRemoved);

function handleChromeTabsUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === "complete") {
        var a = document.createElement("a");
        a.href = tab.url;

        fetchTabInfoForLocation(a.hostname, a.pathname,
            function(info) {
                console.log("[tabs.onUpdate]", tabId, info);
                console.log("chat widget state", ChatWidgetState.state());
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
                    chrome.tabs.executeScript(tabId, { file: "inject_toolbar.js" }, () => {
                        console.log("chat widget state", ChatWidgetState.state());
                        chrome.tabs.sendMessage(tabId, {
                            msg: "injectChatWidget",
                            chatWidgetState: ChatWidgetState.state()
                        });
                    });
                }
            });
    }
}

function handleChromeTabsRemoved(tabId, removeInfo) {
    delete toolbarInfoByTabId[tabId];
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
