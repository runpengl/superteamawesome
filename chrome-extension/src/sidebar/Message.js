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
export default function Message(props) {
    return <div className={cx({
        Message: true,
        pending: props.pending
    })}>
        {props.collapsed ? null : <span className="Message-userName">
            {renderUserName(props.user, props.connectionInfo)}
        </span>}
        {props.collapsed ? null : <span className="Message-timestamp">{renderTime(props.ts)}</span>}
        <div className="Message-message">{props.text}</div>
    </div>;
}

function renderUserName(id, connectionInfo) {
    const users = connectionInfo.users.filter(user => user.id === id);
    if (users.length === 0) {
        return "Unknown User";
    } else {
        return users[0].real_name;
    }
}

function renderTime(ts) {
    const timestampInSeconds = parseInt(ts.split(".")[0], 10);
    const date = new Date(timestampInSeconds * 1000);

    const minutes = "0" + date.getMinutes();
    const hours = date.getHours() % 12;
    const ampm = hours >= 12 ? "pm" : "am";

    return `${hours ? hours : 12}:${minutes.substr(-2, 2)} ${ampm}`;
}
