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
let chatWidget;

renderChatWidget(data);
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
                renderChatWidget(data);
                break;

            case "slackChannelInfo":
                data = Object.assign({}, data, event.data);
                renderChatWidget(data);
                break;

            case "slackMessage":
                data.messages = data.messages.slice();
                data.messages.push(event.data);
                renderChatWidget(data);
                break;
        }
    });
    port.onDisconnect.addListener(function() {
        port = null;
        refreshConnection();
    });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.msg) {
        case "injectChatWidget":
            if (request.chatWidgetState === "expanded") {
                chatWidget.focus();
            }
            break;
    }
});

function renderChatWidget({
    channel,
    connectionInfo,
    connectionStatus,
    messages
}) {
    chatWidget = ReactDOM.render(
        <ChatWidget
            channel={channel}
            connectionInfo={connectionInfo}
            connectionStatus={connectionStatus}
            messages={messages}
            onConfirmMessage={msg => {
                data.messages = data.messages.slice();
                data.messages.push(msg);
                renderChatWidget(data);
            }}
        />,
        document.getElementById("chat")
    );
}
