import * as firebase from "firebase";

import { logEvent } from "./Logger";
import * as Slack from "./SlackHelpers";
import toolbarInfoByTabId from "./toolbarInfoByTabId";

/**
 * Handles chrome.runtime onMessage events. These messages are generally sent from
 * the popup or toolbar to perform auth steps or write to firebase.
 */
export function handleRuntimeMessage(request, sender, sendResponse) {
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

        case "sendMessage":
            Slack.sendMessage(request.channel, request.message, sendResponse);
            return true; // sendResponse will be called asynchronously

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
