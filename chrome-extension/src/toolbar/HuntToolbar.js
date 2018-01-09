import * as React from "react";

import Avatar from "./Avatar";

export default function HuntToolbar(props) {
    return <div className="Toolbar">
        <img className="Toolbar-loadingIndicator" src="../ripple.svg" />

        {props.hunt.isCurrent ? "Current Hunt:" : "Hunt:"}

        <div className="Toolbar-huntName">{props.hunt.name}</div>

        {props.discoveredPage && !props.discoveredPage.ignored
            ? <div className="Toolbar-linkTooltip">Waiting for an admin to create puzzles…</div>
            : null}

        <div className="Toolbar-right">
            <span className="Toolbar-currentUserName">{props.currentUser.displayName}</span>
            <Avatar
                photoUrl={props.currentUser.photoURL}
                isInvisible={false}
                isIdle={false}
            />
        </div>
    </div>;
}
