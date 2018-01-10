import * as React from "react";

import MessageList from "./MessageList";

export default class ChatWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            inputValue: "",
            pendingMessages: []
        };
    }

    render() {
        return <div className="ChatWidget">
            <div className="ChatWidget-header">
                {this.props.channel
                    ? `#${this.props.channel.name}`
                    : "SuperTeamAwesome Chat"}
                <div
                    className="ChatWidget-closeButton"
                    onClick={function() {
                        chrome.runtime.sendMessage({ msg: "closeChatWidget" });
                    }}
                >
                    <svg className="ChatWidget-closeIcon" viewBox="0 0 32 32">
                        <polygon points="24.485,27.314 27.314,24.485 18.828,16 27.314,7.515 24.485,4.686 16,13.172 7.515,4.686 4.686,7.515 13.172,16 4.686,24.485 7.515,27.314 16,18.828 " />
                    </svg>
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
        return <div className="ChatWidget-composer">
            <textarea
                className="ChatWidget-composerInput"
                placeholder={`Message #${this.props.channel.name}`}
                value={this.state.inputValue}
                onChange={this.handleInputChange.bind(this)}
                onKeyDown={this.handleInputKeyDown.bind(this)}
            />
        </div>;
    }

    handleInputChange(event) {
        this.setState({ inputValue: event.target.value });
    }

    handleInputKeyDown(event) {
        if (event.key === "Enter") {
            const ts = `${Math.floor(Date.now() / 1000)}.808080`;
            const pendingMessages = this.state.pendingMessages.slice();
            pendingMessages.push({
                type: "message",
                user: this.props.connectionInfo.self.id,
                text: this.state.inputValue,
                ts,
                pending: true
            });
            this.setState({
                inputValue: "",
                pendingMessages
            });
            chrome.runtime.sendMessage({
                msg: "sendMessage",
                channel: this.props.channel.id,
                message: this.state.inputValue
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
            event.preventDefault();
        }
    }
}
