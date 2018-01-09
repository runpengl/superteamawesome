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

    let channel = null;
    let connectionInfo = null;
    let messages = [];
    port.onMessage.addListener(function(event) {
        console.log(event);
        switch (event.msg) {
            case "slackChannelInfo":
                channel = event.data.channel;
                connectionInfo = event.data.connectionInfo;
                messages = event.data.messages;
                renderSidebar(channel, connectionInfo, messages);
                break;

            case "slackMessage":
                messages.push(event.data);
                renderSidebar(channel, connectionInfo, messages);
                break;
        }
    });
    port.onDisconnect.addListener(function() {
        port = null;
        refreshConnection();
    });
}

refreshConnection();

function renderSidebar(channel, connectionInfo, messages) {
    ReactDOM.render(
        <ChatWidget
            channel={channel}
            connectionInfo={connectionInfo}
            messages={messages}
            onConfirmMessage={msg => {
                messages.push(msg);
                renderSidebar(channel, connectionInfo, messages);
            }}
        />,
        document.getElementById("sidebar")
    );
}
