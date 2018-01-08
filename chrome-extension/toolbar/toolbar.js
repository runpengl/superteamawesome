import * as React from "react";
import * as ReactDOM from "react-dom";

import BasicToolbar from "./src/BasicToolbar";
import HuntToolbar from "./src/HuntToolbar";
import PuzzleToolbar from "./src/PuzzleToolbar";

let toolbarType = null;
let toolbarData = null;

let port;
function refreshConnection() {
    if (port) {
        port.disconnect();
    }
    // Initialize a connection with the background script, which
    // will continue to send data as long as this connection is open.
    port = chrome.runtime.connect({ name: "toolbarLoad" });
    port.onMessage.addListener(function(event) {
        switch (event.msg) {
            case "hunt":
                toolbarType = "hunt";
                toolbarData = event.data;
                return renderToolbar();
            case "puzzle":
                toolbarType = "puzzle";
                toolbarData = Object.assign({}, toolbarData, event.data);
                return renderToolbar();
            case "puzzleViewers":
                toolbarType = "puzzle";
                toolbarData = Object.assign({}, toolbarData, {
                    viewers: event.data.viewers
                });
                return renderToolbar();
            case "slackChannel":
                toolbarData = Object.assign({}, toolbarData, {
                    slackChannel: event.data.channel
                });
                if (toolbarType !== "none") {
                    renderToolbar();
                }
                break;
            case "slackConnectionStatus":
                toolbarData = Object.assign({}, toolbarData, {
                    slackConnectionStatus: event.status
                });
                return renderToolbar();
            case "discoveredPage":
                toolbarData = Object.assign({}, toolbarData, {
                    discoveredPage: event.data
                });
                return renderToolbar();
            default:
                toolbarType = null;
                toolbarData = null;
                renderToolbar();
        }
    });
    port.onDisconnect.addListener(function() {
        port = null;
        refreshConnection();
    });
}

refreshConnection();
chrome.runtime.onMessage.addListener(function(request) {
    if (request.msg === "refreshConnection") {
        toolbarType = "none";
        refreshConnection();
    }
});

function renderToolbar() {
    switch (toolbarType) {
        case "hunt":
            ReactDOM.render(
                React.createElement(HuntToolbar, toolbarData),
                document.getElementById("toolbar")
            );
            break;
        case "puzzle":
            ReactDOM.render(
                React.createElement(PuzzleToolbar, toolbarData),
                document.getElementById("toolbar")
            );
            break;
        default:
            ReactDOM.render(
                React.createElement(BasicToolbar),
                document.getElementById("toolbar")
            );
    }
}

