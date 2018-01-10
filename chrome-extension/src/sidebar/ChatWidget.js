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
