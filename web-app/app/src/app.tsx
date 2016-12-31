import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { browserHistory, IndexRoute, Router, Route } from "react-router";
import { combineReducers, createStore } from "redux";

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
const store = createStore(combineReducers({}));

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
