import cx from "classnames";
import * as React from "react";

export default function Avatar(props) {
    return <div
        className={cx({
            Avatar: true,
            isInvisible: props.isInvisible,
            isIdle: props.isIdle
        })}
    >
        <div className="Avatar-imageFrame">
            <img className="Avatar-image" src={props.photoUrl} />
        </div>
        <div className="Avatar-tooltip">
            {props.displayName}
            {props.isIdle
                ? " (idle)"
                : (props.isInvisible ? " (tab hidden)" : "")}
        </div>
    </div>;
}
