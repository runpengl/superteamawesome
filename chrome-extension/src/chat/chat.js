import * as React from "react";
import * as ReactDOM from "react-dom";

import ChatWidget from "./ChatWidget";

let port;
let data = {
    channel: null,
    connectionInfo: null,
    connectionStatus: "disconnected",
    messages: []
};

renderSidebar(data);
refreshConnection();

function refreshConnection() {
    if (port) {
        port.disconnect();
    }
    // Initialize a connection with the background script, which
    // will continue to send data as long as this connection is open.
    port = chrome.runtime.connect({ name: "chatWidgetLoad" });
    port.onMessage.addListener(function(event) {
        console.log(event);
        switch (event.msg) {
            case "slackConnectionStatus":
                data.connectionStatus = event.status;
                renderSidebar(data);
                break;

            case "slackChannelInfo":
                data = Object.assign({}, data, event.data);
                renderSidebar(data);
                break;

            case "slackMessage":
                data.messages = data.messages.slice();
                data.messages.push(event.data);
                renderSidebar(data);
                break;
        }
    });
    port.onDisconnect.addListener(function() {
        port = null;
        refreshConnection();
    });
}

function renderSidebar({
    channel,
    connectionInfo,
    connectionStatus,
    messages
}) {
    ReactDOM.render(
        <ChatWidget
            channel={channel}
            connectionInfo={connectionInfo}
            connectionStatus={connectionStatus}
            messages={messages}
            onConfirmMessage={msg => {
                data.messages = data.messages.slice();
                data.messages.push(msg);
                renderSidebar(data);
            }}
        />,
        document.getElementById("chat")
    );
}
