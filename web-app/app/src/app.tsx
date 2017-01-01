import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { browserHistory, IndexRoute, Router, Route } from "react-router";
import { applyMiddleware, compose, createStore } from "redux";
import thunk from "redux-thunk";
import * as createLogger from "redux-logger";

import { reducers } from "./reducers";
import { Dashboard } from "./dashboard";
import { Login } from "./login";

interface IAppProps {
    children?: JSX.Element[];
}

class App extends React.Component<IAppProps, {}> {
    public render() {
        return <div>{this.props.children}</div>;
    }
}

// todo: move reducers to reducers folder
const store = compose(applyMiddleware(thunk, createLogger()))(createStore)(reducers);

ReactDOM.render(
  <Provider store={store}>
    <Router history={browserHistory}>
        <Route path="/" component={App}>
            <IndexRoute component={Dashboard} />
            <Route path="login" component={Login} />
        </Route>
    </Router>
  </Provider>,
  document.querySelector("#app")
);
