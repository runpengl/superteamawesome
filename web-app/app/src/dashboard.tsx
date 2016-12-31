import * as React from "react";
import { IRouter } from "react-router";

import { firebaseAuth } from "./auth";

interface IDashboardState {
    isLoading: boolean;
    loggedIn?: boolean;
}

interface IRouterContext {
    router: IRouter;
}

export class Dashboard extends React.Component<{}, IDashboardState> {
    public state: IDashboardState = {
        isLoading: true,
        loggedIn: false,
    };

    public context: IRouterContext;
    static contextTypes = {
        router: React.PropTypes.object.isRequired,
    };

    public componentDidMount() {
        firebaseAuth().onAuthStateChanged((user: firebase.UserInfo) => {
            if (user == null) {
                this.context.router.push("/login");
            } else {
                this.setState({
                    isLoading: false,
                    loggedIn: true,
                });
            }
        });
    }

    public render() {
        if (this.state.isLoading) {
            return <span>Loading...</span>;
        } else {
            if (this.state.loggedIn) {
                return <span>This is a dashboard</span>;
            } else {
                // shouldn't get here
                return <span>Please login</span>;
            }
        }
    }
}