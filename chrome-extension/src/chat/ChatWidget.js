import * as React from "react";

import ChatComposer from "./ChatComposer";
import MessageList from "./MessageList";

export default class ChatWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            pendingMessages: [],
            isFocused: false
        };
    }

    render() {
        return <div className="ChatWidget">
            <div
                className="ChatWidget-header"
                onClick={() => chrome.runtime.sendMessage({ msg: "toggleChatWidget" })}
            >
                {this.props.channel
                    ? [
                          <span key="#" className="ChatWidget-headerOctothorpe">#</span>,
                          <a
                              key="channelName"
                              className="ChatWidget-deeplink"
                              href={`slack://channel?team=T03A0NUTH&id=${this.props.channel.id}`}
                              onClick={event => event.stopPropagation()}
                          >
                              {this.props.channel.name}
                              <span className="ChatWidget-deeplinkTooltip">
                                  Open in Slack
                              </span>
                          </a>
                      ]
                    : "SuperTeamAwesome Chat"}
                <div
                    className="ChatWidget-closeButton"
                    onClick={event => {
                        chrome.runtime.sendMessage({ msg: "closeChatWidget" })
                        event.stopPropagation();
                    }}
                >
                    <svg className="ChatWidget-closeIcon" viewBox="0 0 32 32">
                        <polygon points="24.485,27.314 27.314,24.485 18.828,16 27.314,7.515 24.485,4.686 16,13.172 7.515,4.686 4.686,7.515 13.172,16 4.686,24.485 7.515,27.314 16,18.828 " />
                    </svg>
                </div>
                <div className="ChatWidget-toggleButton">
                    <div className="ChatWidget-toggleIcon" />
                </div>
            </div>
            {this.maybeRenderSlackDisconnectedBanner()}
            {this.props.connectionStatus === "error"
                ? this.renderSlackAuthPrompt()
                : <MessageList
                      messages={this.props.messages}
                      channel={this.props.channel}
                      pendingMessages={this.state.pendingMessages}
                      connectionInfo={this.props.connectionInfo}
                      isComposerFocused={this.state.isFocused}
                  />}
            {this.maybeRenderFooter()}
        </div>;
    }

    maybeRenderSlackDisconnectedBanner() {
        if (this.props.connectionStatus !== "disconnected") {
            return;
        }
        return <div
            className="ChatWidget-slackConnectionErrorBanner"
            onClick={function() {
                chrome.runtime.sendMessage({ msg: "authorizeSlack" });
            }}
        >Disconnected from Slack. Try again?</div>;
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
                      onFocus={this.handleComposerFocus.bind(this)}
                      onBlur={this.handleComposerBlur.bind(this)}
                      onNewMessage={this.handleNewMessage.bind(this)}
                      channel={this.props.channel}
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

    handleComposerFocus() {
        this.setState({ isFocused: true });
    }

    handleComposerBlur() {
        this.setState({ isFocused: false });
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
