import * as React from "react";
import * as ReactDOM from "react-dom";
import PopupLogin from "./PopupLogin";
import PopupRoot from "./PopupRoot";

initApp();

/**
 * initApp handles setting up the Firebase context and registering
 * callbacks for the auth status.
 */
function initApp() {
    var port = chrome.runtime.connect({ name: "popupLoad" });
    port.onMessage.addListener(function(event) {
        switch (event.msg) {
            case "auth":
                popupData = Object.assign({}, popupData, {
                    currentUser: event.user,
                    permissionDenied: false
                });
                return renderPopup();

            case "slackConnectionStatus":
                popupData = Object.assign({}, popupData, {
                    slackConnectionStatus: event.status
                });
                return renderPopup();

            case "permissionDenied":
                popupData = {
                    currentUser: popupData.currentUser,
                    permissionDenied: true
                };
                return renderPopup();

            case "hunt":
                popupData = Object.assign({}, popupData, {
                    currentHunt: event.hunt
                });
                return renderPopup();

            case "puzzles":
                var puzzlesByStatus = {
                    "new": [],
                    inProgress: [],
                    stuck: [],
                    solved: []
                };
                event.puzzles.forEach(function(puzzle) {
                    puzzlesByStatus[puzzle.status].push(puzzle);
                });

                // Group by meta puzzles; ungrouped puzzles at the end
                var puzzleGroups = event.puzzles
                    .filter(function(p) { return p.isMeta; })
                    .map(function(mp) { return [mp]; });
                var otherPuzzles = [];
                var metaIndexByKey = {};
                puzzleGroups.forEach(function(pg, i) {
                    metaIndexByKey[pg[0].key] = i;
                });
                event.puzzles.forEach(function(p) {
                    if (p.parents != null && p.parents.length > 0) {
                        p.parents.forEach(function(parentKey) {
                            if (metaIndexByKey.hasOwnProperty(parentKey)) {
                                puzzleGroups[metaIndexByKey[parentKey]].push(p);
                            }
                        });
                        return;
                    } else if (p.parent) {
                        if (metaIndexByKey.hasOwnProperty(p.parent)) {
                            puzzleGroups[metaIndexByKey[p.parent]].push(p);
                            return;
                        }
                    }
                    if (!p.isMeta) {
                        otherPuzzles.push(p);
                    }
                });
                if (otherPuzzles.length) {
                    puzzleGroups.push(otherPuzzles);
                }

                popupData = Object.assign({}, popupData, {
                    puzzles: event.puzzles,
                    puzzlesByStatus: puzzlesByStatus,
                    puzzleGroups: puzzleGroups
                });
                return renderPopup();

            case "puzzleViewers":
                popupData = Object.assign({}, popupData, {
                    puzzleViewers: event.puzzleViewers
                });
                return renderPopup();
        }
    });
}

//
// Rendering
// ----------------------------------------------------------------------------

var popupData = null;
function renderPopup() {
    ReactDOM.render(
        popupData.currentUser
            ? <PopupRoot {...popupData} />
            : <PopupLogin />,
        document.getElementById("popup")
    );
}
