import * as React from "react";
import { connect, Dispatch } from "react-redux";
import { bindActionCreators } from "redux";
import { InjectedRouter } from "react-router";

import { logoutAction } from "./actions";
import { firebaseAuth } from "./auth";
import { IAppState } from "./state";

interface IOwnProps {}
interface IStateProps {}
interface IDispatchProps {
    logout: () => void;
}

export interface IUserDashboardProps extends IOwnProps, IStateProps, IDispatchProps {}

interface IRouterContext {
    router: InjectedRouter;
}

interface IUserDashboardState {
    loggedIn?: boolean;
}

class UnconnectedUserDashboard extends React.Component<IUserDashboardProps, IUserDashboardState> {
    public state: IUserDashboardState = {
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
                    loggedIn: true,
                });
            }
        });
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
            </div>
        );
    }
}

function mapStateToProps(_state: IAppState, _ownProps: IOwnProps): IStateProps {
    return {};
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        logout: logoutAction,
    }, dispatch);
}

export const UserDashboard = connect(mapStateToProps, mapDispatchToProps)(UnconnectedUserDashboard);