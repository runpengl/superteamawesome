import * as React from "react";
import { IRouter } from "react-router";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import { IAsyncLoaded, isAsyncLoaded, loadHuntAndUserInfoAction } from "./actions";
import { firebaseAuth } from "./auth";
import { IAppState, IHuntState } from "./state";

interface IDashboardState {
    isLoading?: boolean;
    loggedIn?: boolean;
}

interface IRouterContext {
    router: IRouter;
}

interface IOwnProps {}
interface IDispatchProps {
    loadHuntAndUserInfo: () => void;
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
        const { loadHuntAndUserInfo } = this.props;
        firebaseAuth().onAuthStateChanged((user: firebase.UserInfo) => {
            if (user == null) {
                this.context.router.push("/login");
            } else {
                this.setState({
                    loggedIn: true,
                });
                loadHuntAndUserInfo();
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

    private renderDashboard() {
        const hunt = this.props.hunt.value;
        return (
            <div className="dashboard">
                <div className="header">
                    <h1>STAPH</h1>
                    <div className="sub-header">Super Team Awesome Puzzle Helper</div>
                </div>
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
    }, dispatch);
}

export const Dashboard = connect(mapStateToProps, mapDispatchToProps)(UnconnectedDashboard);