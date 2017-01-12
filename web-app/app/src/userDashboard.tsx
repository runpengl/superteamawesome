import * as React from "react";
import { connect, Dispatch } from "react-redux";
import { bindActionCreators } from "redux";
import { InjectedRouter } from "react-router";

import {
    IAsyncLoaded,
    isAsyncLoaded,
    isAsyncInProgress,
    bootstrapUsersAction,
    loadUsersAndAuthInfoAction,
    logoutAction,
} from "./actions";
import { firebaseAuth } from "./auth";
import { IAppLifecycle, IAppState, IHuntState, LoginStatus } from "./state";

interface IOwnProps {}
interface IStateProps {
    hunt: IAsyncLoaded<IHuntState>;
    lifecycle: IAppLifecycle;
}

interface IDispatchProps {
    bootstrapUsers: (driveFolderId: string) => void;
    loadUsersAndAuthInfo: () => void;
    logout: () => void;
}

export interface IUserDashboardProps extends IOwnProps, IStateProps, IDispatchProps {}

interface IRouterContext {
    router: InjectedRouter;
}

interface IUserDashboardState {
    isFirebaseLoggedIn?: boolean;
    loggedIn?: boolean;
}

class UnconnectedUserDashboard extends React.Component<IUserDashboardProps, IUserDashboardState> {
    public state: IUserDashboardState = {
        isFirebaseLoggedIn: false,
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
                this.setState({ isFirebaseLoggedIn: true });
            }
        });
    }

    public componentDidUpdate(oldProps: IUserDashboardProps) {
        const { bootstrapUsers, hunt, loadUsersAndAuthInfo, lifecycle } = this.props;
        if (isAsyncLoaded(hunt) && isAsyncInProgress(oldProps.hunt)) {
            bootstrapUsers(hunt.value.driveFolderId);
        }

        if (this.state.isFirebaseLoggedIn && !this.state.loggedIn) {
            this.setState({ loggedIn: true });

            if (lifecycle.loginStatus !== LoginStatus.LOGGED_IN) {
                loadUsersAndAuthInfo();
            }
        }
    }

    public render() {
        if (this.state.loggedIn) {
            return this.renderDashboard();
        } else {
            // shouldn't get here
            return <div>Please <a href="/login">login</a></div>;
        }
    }

    private handleLogout = () => {
        const { logout } = this.props;
        logout();
    }

    private routeToAdminDashboard = () => {
        this.context.router.push("/admin");
    }

    private renderDashboard() {
        return (
            <div className="dashboard">
                <div className="header">
                    <div className="header-container">
                        <h1>STAPH [ADMIN]</h1>
                        <div className="sub-header">Super Team Awesome Puzzle Helper</div>
                    </div>
                    <button className="user-button" onClick={this.routeToAdminDashboard}>Manage Puzzles</button>
                    <button className="logout-button" onClick={this.handleLogout}>Logout</button>
                </div>
                {this.maybeRenderUserInfo()}
            </div>
        );
    }

    private maybeRenderUserInfo() {
        const { hunt } = this.props;
        if (isAsyncLoaded(hunt)) {
            return <span>users</span>;
        } else {
            return <span>Loading...</span>;
        }
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    return {
        hunt: state.hunt,
        lifecycle: state.lifecycle,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        loadUsersAndAuthInfo: loadUsersAndAuthInfoAction,
        logout: logoutAction,
        bootstrapUsers: bootstrapUsersAction,
    }, dispatch);
}

export const UserDashboard = connect(mapStateToProps, mapDispatchToProps)(UnconnectedUserDashboard);