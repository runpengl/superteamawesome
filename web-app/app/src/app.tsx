import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from 'react-redux'
import { combineReducers, createStore } from 'redux'

import Button from "./components/button";

const application: JSX.Element = (
    <div>
        <Button>hi there</Button>
    </div>
);

// todo: move reducers to reducers folder
const store = createStore(combineReducers({}));

ReactDOM.render(
  <Provider store={store}>
    {application}
  </Provider>,
  document.querySelector("#app")
);
