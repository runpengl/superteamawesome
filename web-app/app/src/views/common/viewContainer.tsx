import * as classnames from "classnames";
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
    location: string;
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

        if (this.props.loginStatus === LoginStatus.NONE && nextProps.loginStatus === LoginStatus.LOGGED_OUT) {
            this.setState({ isFirebaseLoaded: true, isFirebaseLoggedIn: false });
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
                    <Link
                        to="/admin"
                        className={classnames("route-link", { active: this.props.location === "/admin" })}
                    >
                        Puzzles
                    </Link>
                    <Link
                        to="/admin/users"
                        className={classnames("route-link", {
                            active: this.props.location === "/admin/users",
                        })}
                    >
                        Users
                    </Link>
                    <Link
                        to="/admin/hunts"
                        className={classnames("route-link", {
                            active: this.props.location === "/admin/hunts",
                        })}
                    >
                        Hunts
                    </Link>
                    {this.state.loggedIn && (
                        <a className="logout-button route-link" onClick={this.handleLogout}>
                            Logout
                        </a>
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
        location: state.router.location.pathname,
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
