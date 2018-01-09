import * as React from "react";
import * as ReactDOM from "react-dom";

import ChatWidget from "./ChatWidget";

let port;
function refreshConnection() {
    if (port) {
        port.disconnect();
    }
    // Initialize a connection with the background script, which
    // will continue to send data as long as this connection is open.
    port = chrome.runtime.connect({ name: "sidebarLoad" });
    port.onMessage.addListener(function(event) {
        console.log(event);
        switch (event.msg) {
            case "slackChannelInfo":
                ReactDOM.render(
                    <ChatWidget {...event.data} />,
                    document.getElementById("sidebar")
                );
                break;
        }
    });
    port.onDisconnect.addListener(function() {
        port = null;
        refreshConnection();
    });
}

refreshConnection();