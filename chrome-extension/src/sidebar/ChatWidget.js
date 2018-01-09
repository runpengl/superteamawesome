import * as React from "react";

import Message from "./Message";

export default class ChatWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = { inputValue: "" };
    }

    componentDidMount() {
        this.messagesNode.scrollTop = this.messagesNode.scrollHeight;
    }

    render() {
        return <div className="ChatWidget">
            <div className="ChatWidget-header">
                #{this.props.channel.name}
            </div>
            <div className="ChatWidget-messages" ref={n => this.messagesNode = n}>
                {this.props.messages.map(function(message) {
                    return <Message key={message.ts} {...message} />;
                })}
            </div>
            <div className="ChatWidget-composer">
                <textarea
                    className="ChatWidget-composerInput"
                    placeholder={`Message ${this.props.channel.name}`}
                    value={this.state.inputValue}
                    onChange={this.handleInputChange.bind(this)}
                    onKeyDown={this.handleInputKeyDown.bind(this)}
                />
            </div>
        </div>;
    }

    handleInputChange(event) {
        this.setState({ inputValue: event.target.value });
    }

    handleInputKeyDown(event) {
        if (event.key === "Enter") {
            chrome.runtime.sendMessage({
                msg: "sendMessage",
                channel: this.props.channel.id,
                message: this.state.inputValue
            });
            this.setState({ inputValue: "" });
            event.preventDefault();
        }
    }
}
