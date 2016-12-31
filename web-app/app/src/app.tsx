import * as React from "react";
import * as ReactDOM from "react-dom";

import Button from "./components/button";

const application: JSX.Element = (
    <div>
        <Button>hi there</Button>
    </div>
);

ReactDOM.render(application, document.querySelector("#app"));
