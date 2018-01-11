import * as React from "react";

import ChatComposer from "./ChatComposer";
import MessageList from "./MessageList";

export default class ChatWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            pendingMessages: []
        };
    }

    render() {
        return <div className="ChatWidget">
            <div
                className="ChatWidget-header"
                onClick={() => chrome.runtime.sendMessage({ msg: "toggleChatWidget" })}
            >
                {this.props.channel
                    ? `#${this.props.channel.name}`
                    : "SuperTeamAwesome Chat"}
                <div
                    className="ChatWidget-closeButton"
                    onClick={() => chrome.runtime.sendMessage({ msg: "closeChatWidget" })}
                >
                    <svg className="ChatWidget-closeIcon" viewBox="0 0 32 32">
                        <polygon points="24.485,27.314 27.314,24.485 18.828,16 27.314,7.515 24.485,4.686 16,13.172 7.515,4.686 4.686,7.515 13.172,16 4.686,24.485 7.515,27.314 16,18.828 " />
                    </svg>
                </div>
                <div className="ChatWidget-toggleButton">
                    <div className="ChatWidget-toggleIcon" />
                </div>
            </div>
            {this.props.connectionStatus === "error"
                ? this.renderSlackAuthPrompt()
                : <MessageList
                      messages={this.props.messages}
                      pendingMessages={this.state.pendingMessages}
                      connectionInfo={this.props.connectionInfo}
                  />}
            {this.maybeRenderFooter()}
        </div>;
    }

    renderSlackAuthPrompt() {
        return <div
            className="ChatWidget-slackConnectionErrorBanner"
            onClick={function() {
                chrome.runtime.sendMessage({ msg: "authorizeSlack" });
            }}
        >Couldn't connect to Slack. Try again?</div>;
    }

    maybeRenderFooter() {
        if (!this.props.channel) {
            return null;
        }
        return this.props.channel.is_member
            ? <div className="ChatWidget-composer">
                  <ChatComposer
                      placeholder={`Message #${this.props.channel.name}`}
                      onNewMessage={this.handleNewMessage.bind(this)}
                      connectionInfo={this.props.connectionInfo}
                  />
              </div>
            : this.renderChannelPreviewFooter();
    }

    renderChannelPreviewFooter() {
        return <div className="ChatWidget-previewFooter">
            {"You are viewing "}
            <span className="ChatWidget-previewFooterChannelName">
                #{this.props.channel.name}
            </span>
            <div
                className="ChatWidget-previewJoinChannelButton"
                onClick={() => chrome.runtime.sendMessage({
                    msg: "joinChannel",
                    name: this.props.channel.name
                })}
            >
                Join Channel
            </div>
        </div>;
    }

    handleNewMessage(message) {
        const ts = `${Math.floor(Date.now() / 1000)}.808080`;
        const pendingMessages = this.state.pendingMessages.slice();
        pendingMessages.push({
            type: "message",
            user: this.props.connectionInfo.self.id,
            text: message,
            ts,
            pending: true
        });

        // optimistic update
        this.setState({ pendingMessages });

        // send to slack via API and wait for confirmation
        chrome.runtime.sendMessage({
            msg: "sendMessage",
            channel: this.props.channel.id,
            message
        }, /*options*/{}, response => {
            if (response.ok) {
                this.setState({
                    pendingMessages: this.state.pendingMessages.filter(msg => msg.ts !== ts)
                });
                this.props.onConfirmMessage({
                    type: "message",
                    user: this.props.connectionInfo.self.id,
                    ts: response.ts,
                    text: response.text
                });
            }
        });
    }
}
