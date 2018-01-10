import * as React from "react";

import Message from "./Message";

export default class MessageList extends React.Component {
    constructor(props) {
        super(props);
        this.state = { shouldStickToBottom: true };
    }

    componentDidMount() {
        this.messagesNode.scrollTop = this.messagesNode.scrollHeight;
    }

    componentWillReceiveProps() {
        this.setState({
            shouldStickToBottom: this.messagesNode.scrollTop ===
                this.messagesNode.scrollHeight - this.messagesNode.offsetHeight
        });
    }

    componentDidUpdate(prevProps) {
        if (
            // Increase in # pendingMessages means the user just sent a message.
            // Scroll to the bottom so we can see the new message.
            prevProps.pendingMessages.length < this.props.pendingMessages.length ||
            this.state.shouldStickToBottom
        ) {
            this.messagesNode.scrollTop = this.messagesNode.scrollHeight;
        }
    }

    render() {
        const allMessages = this.props.messages.concat(this.props.pendingMessages);

        return <div className="MessageList" ref={n => this.messagesNode = n}>
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
        </div>;
    }
}