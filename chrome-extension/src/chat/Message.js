import cx from "classnames";
import * as React from "react";

/**
 *
 * @param props
 *   type: "message"
 *   user: string
 *   text: string
 *   ts: string
 */
export default class Message extends React.Component {
    render() {
        const props = this.props;

        if (props.hidden) {
            return null;
        }
        return <div className={cx({
            Message: true,
            pending: props.pending,
            system: isSystemMessage(props),
            unread: props.unread
        })}>
            {props.collapsed ? null : renderUserName(props.user, props.connectionInfo) }
            {props.collapsed || props.pending ? null : <span className="Message-timestamp">
                {renderTime(props.ts)}
            </span>}
            <div className="Message-message">
                {renderRichText(props.text, props.connectionInfo)}
                {props.edited ? <span className="Message-edited">(edited)</span> : null}
            </div>
        </div>;
    }
}

function isSystemMessage(props) {
    switch (props.subtype) {
        case "channel_archive":
        case "channel_join":
        case "channel_leave":
        case "channel_name":
        case "channel_purpose":
        case "channel_topic":
        case "channel_unarchive":
        case "reminder_add":
            return true;
    }
    return false;
}

function renderUserName(id, connectionInfo) {
    const users = connectionInfo.users.filter(user => user.id === id);
    return <span className="Message-userName">
        {users.length === 0
            ? "Unknown User"
            : [
                  users[0].real_name,
                  <span className="Message-nameTooltip">
                      @{users[0].name}
                  </span>
              ]}
    </span>;
}

function renderTime(ts) {
    const timestampInSeconds = parseInt(ts.split(".")[0], 10);
    const date = new Date(timestampInSeconds * 1000);

    const minutes = "0" + date.getMinutes();
    const hours = date.getHours() % 12;
    const ampm = hours >= 12 ? "pm" : "am";

    return `${hours ? hours : 12}:${minutes.substr(-2, 2)} ${ampm}`;
}

// https://api.slack.com/docs/message-formatting#how_to_display_formatted_messages
function renderRichText(text, connectionInfo) {
    return text.split(/(<[^>]+)>/).map((chunk, i) => {
        if (chunk.charAt(0) === "<") {
            switch (chunk.charAt(1)) {
                case "#": // channel
                    return renderChannelMention(chunk.substr(2).split("|"), connectionInfo, i);

                case "@": // user
                    return renderUserMention(chunk.substr(2).split("|"), connectionInfo, i);

                case "!": // special command
                    return renderCommand(chunk.substr(2).split("|"), i);

                default:
                    return renderLink(chunk.substr(1).split("|"), i);
            }
        } else {
            return renderMrkdwn(chunk);
        }
    });
}

function renderMrkdwn(text) {
    return text.split(/```/).map((preBlock, i) => {
        if (i % 2 === 1) {
            return renderPreBlock(preBlock, i);
        }
        return preBlock.split(/(\n)/).map((line, j) => {
            if (j % 2 === 1) {
                return <br key={j} />;
            }
            return line.split(/`([^`]+)`/).map((lineChunk, j) => {
                if (j % 2 === 1) {
                    return renderCode(lineChunk, j);
                }
                // TODO more mrkdwn (bold, italic)
                return lineChunk
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">");
            });
        });
    });
}

function renderChannelMention([id, displayName], connectionInfo, key) {
    const channels = connectionInfo.channels.filter(channel => channel.id === id);
    return <a
        key={key}
        className="Message-channelMention"
        href={`slack://channel?team=T03A0NUTH&id=${id}`}
    >
        #{displayName || (channels.length === 0 ? "unknown" : channels[0].name)}
    </a>;
}

function renderUserMention([id, displayName], connectionInfo, key) {
    const users = connectionInfo.users.filter(user => user.id === id);
    return <span
        key={key}
        className={cx({
            "Message-userMention": true,
            "Message-selfMention": id === connectionInfo.self.id
        })}
    >
        @{displayName || (users.length === 0 ? "unknown" : users[0].name)}
    </span>;
}

// https://api.slack.com/docs/message-formatting#variables
function renderCommand([commandName, displayName], key) {
    let text = `<${displayName || commandName}>`;
    switch (commandName) {
        case "channel":
            text = "@channel";
            break;
        case "here":
            text = "@here";
            break;
        case "everyone":
            text = "@everyone";
            break;
    }
    return <span className="Message-command Message-selfMention" key={key}>{text}</span>;
}

function renderLink([url, displayName], key) {
    return <a key={key} href={url} target="_blank">{displayName || url}</a>;
}

function renderPreBlock(text, key) {
    return <pre key={key} className="Message-pre">{text}</pre>;
}

function renderCode(text, key) {
    return <code key={key} className="Message-code">{text}</code>;
}
