import * as React from "react";
import { connect } from "react-redux";
import { Redirect } from "react-router";
import { Link } from "react-router-dom";
import { bindActionCreators, Dispatch } from "redux";
import { firebaseAuth } from "../../auth";
import { getSlackAuthUrl } from "../../services/slackService";
import { logoutAction } from "../../store/actions/authActions";
import { IAppState, LoginStatus } from "../../store/state";

interface IDispatchProps {
    logout: () => void;
}

interface IOwnProps {
    isContentReady: boolean;
    onLoggedIn: () => void;
}

interface IStateProps {
    loginStatus: LoginStatus;
    slackToken: string;
}

export interface IViewContainerState {
    isFirebaseLoggedIn: boolean;
    loggedIn: boolean;
    isFirebaseLoaded: boolean;
}

export type IViewContainerProps = IDispatchProps & IOwnProps & IStateProps;

class UnconnectedViewContainer extends React.PureComponent<IViewContainerProps, IViewContainerState> {
    public state: IViewContainerState = {
        isFirebaseLoaded: false,
        isFirebaseLoggedIn: false,
        loggedIn: false,
    };

    public componentDidMount() {
        firebaseAuth().onAuthStateChanged((user: firebase.UserInfo) => {
            this.setState({ isFirebaseLoaded: true, isFirebaseLoggedIn: user != null });
        });
    }

    public componentDidUpdate() {
        const { onLoggedIn } = this.props;

        if (this.state.isFirebaseLoggedIn && !this.state.loggedIn) {
            this.setState({ loggedIn: true });
            onLoggedIn();
        }
    }

    public componentWillReceiveProps(nextProps: IViewContainerProps) {
        if (nextProps.slackToken === undefined && nextProps.loginStatus === LoginStatus.LOGGED_IN) {
            (window as any).location = getSlackAuthUrl();
        } else if (
            nextProps.slackToken !== undefined &&
            this.props.slackToken === undefined &&
            nextProps.loginStatus === LoginStatus.LOGGED_IN &&
            !nextProps.isContentReady
        ) {
            this.setState({
                loggedIn: true,
            });
            nextProps.onLoggedIn();
        }

        if (nextProps.loginStatus === LoginStatus.LOGGED_IN && this.props.loginStatus !== LoginStatus.LOGGED_IN) {
            this.setState({
                loggedIn: true,
            });
        }
    }

    public render() {
        if (this.state.isFirebaseLoaded && !this.state.isFirebaseLoggedIn) {
            return <Redirect to="/login" />;
        }

        return (
            <div className="dashboard">
                <div className="header">
                    <div className="header-container">
                        <h1>STAPH [ADMIN]</h1>
                        <div className="sub-header">Super Team Awesome Puzzle Helper</div>
                    </div>
                    <Link to="/admin">
                        <button className="user-button">Manage Puzzles</button>
                    </Link>
                    <Link to="/admin/users">
                        <button className="user-button">Manage Users</button>
                    </Link>
                    {this.state.loggedIn && (
                        <button className="logout-button" onClick={this.handleLogout}>
                            Logout
                        </button>
                    )}
                </div>
                {this.props.children}
            </div>
        );
    }

    private handleLogout = () => {
        this.props.logout();
    };
}

function mapStateToProps(state: IAppState): IStateProps {
    return {
        loginStatus: state.lifecycle.loginStatus,
        slackToken: state.auth.slackToken,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators(
        {
            logout: logoutAction,
        },
        dispatch,
    );
}

export const ViewContainer = connect(
    mapStateToProps,
    mapDispatchToProps,
)(UnconnectedViewContainer);
