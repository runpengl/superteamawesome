import createHistory from "history/createBrowserHistory";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { Redirect, Route, Router, Switch } from "react-router";
import { applyMiddleware, compose, createStore } from "redux";
import { createLogger } from "redux-logger";
import thunk from "redux-thunk";

import { reducers } from "./store/reducers";
import { AdminDashboard } from "./views/adminDashboard";
import { Login } from "./views/login";
import { SlackAuth } from "./views/slackAuth";
import { UserDashboard } from "./views/userDashboard";

const middleware =
    process.env.NODE_ENV !== "production" ? applyMiddleware(thunk, createLogger()) : applyMiddleware(thunk);
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
    document.querySelector("#app"),
);
