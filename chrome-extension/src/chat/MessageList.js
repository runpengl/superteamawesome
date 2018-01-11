import * as React from "react";

import Message from "./Message";

export default class MessageList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            shouldStickToBottom: true,
            suppressUnread: false
        };
    }

    componentDidMount() {
        this.messagesNode.scrollTop = this.messagesNode.scrollHeight;
    }

    componentWillReceiveProps(nextProps) {
        const isScrolledToBottomish = this.isScrolledToBottomish();
        this.setState({ shouldStickToBottom: isScrolledToBottomish });

        if ( // IF...
            // ...we are focused and looking at the most recent messages
            nextProps.isComposerFocused && isScrolledToBottomish &&
            // ...the channel did not have outstanding unread messages
            (this.state.suppressUnread || this.numUnread(this.props) === 0) &&
            // ...and we now have some unread messages
            this.numUnread(nextProps) > 0
        ) {
            // The user should be focused on the chat window, so we can immediately
            // mark the channel as read.
            chrome.runtime.sendMessage({
                msg: "markChannelRead",
                channel: this.props.channel.id,
                ts: nextProps.messages[nextProps.messages.length - 1].ts
            });
            this.setState({ suppressUnread: true });
        } else {
            this.setState({ suppressUnread: false })
        }
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

        const firstUnread = this.props.messages
            .filter(msg => msg.ts > this.props.channel.last_read)[0];
        const firstUnreadNode = firstUnread && ReactDOM.findDOMNode(this.refs[firstUnread.ts]);
        if (
            this.props.isComposerFocused && this.isScrolledToBottomish() &&
            firstUnreadNode && firstUnreadNode.getBoundingClientRect().top >
                this.messagesNode.getBoundingClientRect().top
        ) {
            // User is focused and all unread messages are in view. Mark as read!
            chrome.runtime.sendMessage({
                msg: "markChannelRead",
                channel: this.props.channel.id,
                ts: this.props.messages[this.props.messages.length - 1].ts
            });
        }
    }

    render() {
        const allMessages = this.props.messages.concat(this.props.pendingMessages);

        return <div className="MessageList">
            {this.maybeRenderUnreadBanner()}
            <div
                className="MessageList-messages"
                ref={n => this.messagesNode = n}
            >
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
                        ref={message.ts}
                        {...message}
                        unread={!this.state.suppressUnread &&
                            message.ts > this.props.channel.last_read}
                        collapsed={collapsed}
                        connectionInfo={this.props.connectionInfo}
                    />;
                })}
            </div>
        </div>;
    }

    isScrolledToBottomish() {
        return this.messagesNode && this.messagesNode.scrollTop + 10 >=
            this.messagesNode.scrollHeight - this.messagesNode.offsetHeight;
    }

    numUnread(props) {
        return (props.channel && props.channel.unread_count_display) ||
            props.messages.filter(
                msg => !msg.subtype && msg.ts > props.channel.last_read
            ).length || 0;
    }

    maybeRenderUnreadBanner() {
        const numUnread = this.numUnread(this.props);
        const shouldDisplayBanner = numUnread && !this.state.suppressUnread;
        if (!shouldDisplayBanner) {
            return null;
        }
        return <div className="MessageList-unreadBanner">
            {`${numUnread} Unread message`}
            {numUnread > 1 ? "s" : null}
            <span
                className="MessageList-clearUnreadLink"
                onClick={() => chrome.runtime.sendMessage({
                    msg: "markChannelRead",
                    channel: this.props.channel.id,
                    ts: this.props.messages[this.props.messages.length - 1].ts
                })}
            >
                Clear
            </span>
        </div>;
    }
}