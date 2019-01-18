import { ConnectedRouter, connectRouter, routerMiddleware } from "connected-react-router";
import createHistory from "history/createBrowserHistory";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { Redirect, Route, Switch } from "react-router";
import { applyMiddleware, compose, createStore } from "redux";
import { createLogger } from "redux-logger";
import thunk from "redux-thunk";

import { reducers } from "./store/reducers";
import { AdminDashboard } from "./views/adminDashboard";
import { AllHuntsDashboard } from "./views/huntDashboard";
import { Login } from "./views/login";
import { PuzzleActionDashboard } from "./views/puzzleActionDashboard";
import { SlackAuth } from "./views/slackAuth";
import { UserDashboard } from "./views/userDashboard";

const history = createHistory();
const middleware =
    process.env.NODE_ENV !== "production"
        ? applyMiddleware(routerMiddleware(history), thunk, createLogger())
        : applyMiddleware(routerMiddleware(history), thunk);

const store = createStore(
    connectRouter(history)(reducers), // root reducer with router state
    {},
    compose(middleware),
);

ReactDOM.render(
    <Provider store={store}>
        <ConnectedRouter history={history}>
            <Switch>
                <Route exact={true} path="/" render={() => <Redirect to="/admin" />} />
                <Route path="/admin/puzzle/:discoveredPageKey/:actionType" component={PuzzleActionDashboard} />
                <Route path="/admin/users" component={UserDashboard} />
                <Route path="/admin/hunts" component={AllHuntsDashboard} />
                <Route path="/admin" component={AdminDashboard} />
                <Route path="/login" component={Login} />
                <Route path="/slack/auth" component={SlackAuth} />
            </Switch>
        </ConnectedRouter>
    </Provider>,
    document.querySelector("#app"),
);
