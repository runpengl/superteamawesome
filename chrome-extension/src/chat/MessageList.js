import cx from "classnames";
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
            // Scroll to bottom so we can see that a file upload is in progress
            !prevProps.isUploadingFile && this.props.isUploadingFile ||
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
        const allMessages = cleanupMessages(this.props.messages.concat(this.props.pendingMessages));

        return <div className="MessageList">
            {this.maybeRenderUnreadBanner()}
            <div
                className="MessageList-messages"
                ref={n => this.messagesNode = n}
            >
                {allMessages.map((message, i) => {
                    return <Message
                        key={message.ts}
                        ref={message.ts}
                        {...message}
                        unread={!this.state.suppressUnread &&
                            message.ts > this.props.channel.last_read}
                        connectionInfo={this.props.connectionInfo}
                    />;
                })}
                {this.props.isUploadingFile
                    ? <div className="MessageList-uploadingFile">
                        <img className="MessageList-uploadingIndicator" src="../ripple.svg" />
                        uploading...
                    </div>
                    : null}
                {this.maybeRenderTypingIndicator()}
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

    maybeRenderTypingIndicator() {
        return <div className={cx({
            "MessageList-typingIndicator": true,
            visible: this.props.channel && this.props.channel.user_typing
        })}>Someone is typing…</div>;
    }
}

function shouldMessageCollapse(messages, i) {
    if (i > 0 && messages[i-1].user === messages[i].user) {
        const currentTs = parseInt(messages[i].ts.split(".")[0], 10);
        const prevTs = parseInt(messages[i-1].ts.split(".")[0], 10);
        if (prevTs >= currentTs - 60 * 5) {
            // last message was by the same user within 5 minutes; collapse
            return true;
        }
    }
    return false;
}

function cleanupMessages(messages) {
    return messages.reduce((acc, _, i) => {
        if (["channel_join", "channel_leave"].includes(messages[i].subtype)) {
            let consolidatedMsg;
            if (i > 0 && acc[acc.length-1].subtype === "STA_channel_joinleave") {
                // if the previous message was also about a leave/join,
                // then combine with it
                consolidatedMsg = acc[acc.length-1];
                if (messages[i].subtype === "channel_join") {
                    consolidatedMsg.joined.push(messages[i].user);
                } else {
                    consolidatedMsg.left.push(messages[i].user);
                }
            } else {
                // add joined and left fields to the message.
                const { subtype, user } = messages[i];
                const joined = subtype === "channel_join" ? [user] : [];
                const left = subtype === "channel_leave" ? [user] : [];
                consolidatedMsg = {
                    ...messages[i],
                    subtype: "STA_channel_joinleave",
                    joined,
                    left,
                    collapsed: true,
                };
                acc.push(consolidatedMsg);
            }
            // rewrite the message text.
            const { joined, left } = consolidatedMsg;
            const usersToTextList = users => {
                const n = users.length;
                const richUsers = users.map(user => `<@${user}>`);
                if (n > 2) {
                    return richUsers.slice(0, n-1).join(", ") + ", and " + richUsers[n-1];
                } else if (n === 2) {
                    return `${richUsers[0]} and ${richUsers[1]}`;
                } else {
                    return richUsers[0];
                }
            }
            let text = '';
            if (joined.length > 0) {
                text += usersToTextList(joined) + " joined. ";
            }
            if (left.length > 0) {
                text += usersToTextList(left) + " left.";
            }
            consolidatedMsg.text = text;
        } else {
            acc.push({
                collapsed: shouldMessageCollapse(messages, i),
                ...messages[i]
            });
        }
        return acc;
    }, []);
}
