import * as React from "react";
import { InjectedRouter } from "react-router";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import { IAsyncLoaded, isAsyncLoaded, logoutAction, loadHuntAndUserInfoAction } from "./actions";
import { firebaseAuth } from "./auth";
import { IAppState, IHuntState } from "./state";

interface IDashboardState {
    isLoading?: boolean;
    loggedIn?: boolean;
}

interface IRouterContext {
    router: InjectedRouter;
}

interface IOwnProps {}

interface IDispatchProps {
    loadHuntAndUserInfo: () => void;
    logout: () => void;
}

interface IStateProps {
    hunt: IAsyncLoaded<IHuntState>;
}

interface IDashboardProps extends IOwnProps, IDispatchProps, IStateProps {}

class UnconnectedDashboard extends React.Component<IDashboardProps, IDashboardState> {
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
                this.context.router.push("/admin");
            }
        });
    }

    public componentDidUpdate(oldProps: IDashboardProps) {
        if (!isAsyncLoaded(oldProps.hunt) && isAsyncLoaded(this.props.hunt)) {
            this.setState({ isLoading: false });
        }
    }

    public render() {
        if (this.state.isLoading) {
            return <span>Loading...</span>;
        } else {
            if (this.state.loggedIn) {
                return this.renderDashboard();
            } else {
                // shouldn't get here
                return <span>Please login</span>;
            }
        }
    }

    private goToAdmin = () => {
        this.context.router.push("/admin");
    }

    private handleLogout = () => {
        const { logout } = this.props;
        logout();
    }

    private renderDashboard() {
        const hunt = this.props.hunt.value;
        return (
            <div className="dashboard">
                <div className="header">
                    <h1>STAPH</h1>
                    <div className="sub-header">Super Team Awesome Puzzle Helper</div>
                    <button onClick={this.goToAdmin}>Admin View</button>
                </div>
                <button onClick={this.handleLogout}>Logout</button>
                <div className="hunt-header">
                    <div className="label">Current Hunt: {hunt.name}</div>
                </div>
            </div>
        )
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    const { hunt } = state;
    return {
        hunt,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        loadHuntAndUserInfo: loadHuntAndUserInfoAction,
        logout: logoutAction,
    }, dispatch);
}

export const Dashboard = connect(mapStateToProps, mapDispatchToProps)(UnconnectedDashboard);