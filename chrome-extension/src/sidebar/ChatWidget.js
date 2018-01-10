import * as React from "react";

import Message from "./Message";

export default class ChatWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            inputValue: "",
            pendingMessages: []
        };
    }

    componentDidMount() {
        this.messagesNode.scrollTop = this.messagesNode.scrollHeight;
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            shouldStickToBottom: this.messagesNode.scrollTop ===
                this.messagesNode.scrollHeight - this.messagesNode.offsetHeight
        });
    }

    componentDidUpdate(prevProps, prevState) {
        if (
            prevState.pendingMessages.length < this.state.pendingMessages.length ||
            this.state.shouldStickToBottom
        ) {
            this.messagesNode.scrollTop = this.messagesNode.scrollHeight;
        }
    }

    render() {
        const allMessages = this.props.messages.concat(this.state.pendingMessages);
        return <div className="ChatWidget">
            <div className="ChatWidget-header">
                #{this.props.channel.name}
            </div>
            <div className="ChatWidget-messages" ref={n => this.messagesNode = n}>
                {allMessages.map((message, i) => {
                    let collapsed = false;
                    if (i > 0 && allMessages[i-1].user === message.user) {
                        const currentTs = parseInt(message.ts.split(".")[0], 10);
                        const prevTs = parseInt(allMessages[i-1].ts.split(".")[0], 10);
                        if (prevTs >= currentTs - 60 * 5) {
                            // last message was by the same user within 5 minutes; collapse
                            collapsed = true
                        }
                    }
                    return <Message
                        key={message.ts}
                        {...message}
                        collapsed={collapsed}
                        connectionInfo={this.props.connectionInfo}
                    />;
                })}
            </div>
            <div className="ChatWidget-composer">
                <textarea
                    className="ChatWidget-composerInput"
                    placeholder={`Message #${this.props.channel.name}`}
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
