import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { Switch, Redirect, Router, Route } from "react-router";
import createHistory from "history/createBrowserHistory";
import { applyMiddleware, compose, createStore } from "redux";
import thunk from "redux-thunk";
import { createLogger } from "redux-logger";

import { reducers } from "./reducers";
import { AdminDashboard } from './adminDashboard';
import { UserDashboard } from "./userDashboard";
import { Login } from "./login";
import { SlackAuth } from "./slackAuth";

let middleware = process.env.NODE_ENV !== 'production' ? applyMiddleware(thunk, createLogger()) : applyMiddleware(thunk);
// todo: move reducers to reducers folder
const store = compose(middleware)(createStore)(reducers);
const history = createHistory();
ReactDOM.render(
  <Provider store={store}>
    <Router history={history}>
        <Switch>
            <Route exact={true} path="/" render={() => <Redirect to="/admin" />} />
            <Route path="/admin/users" component={UserDashboard} />
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/login" component={Login} />
            <Route path="/slack/auth" component={SlackAuth} />
        </Switch>
    </Router>
  </Provider>,
  document.querySelector("#app")
);
