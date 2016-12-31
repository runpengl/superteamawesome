import * as React from "react";

interface Props {
    onClick: () => void;
}

const Button: React.SFC<Props> = props => {
    return <a
        className="Button"
        children={props.children}
        onClick={props.onClick}
    />;
};

export { Button as default };
