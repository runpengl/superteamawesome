import * as React from "react";
import { Link } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { IAppState } from '../../store/state';
import { logoutAction } from '../../store/actions/authActions';
import { connect } from 'react-redux';
import { firebaseAuth } from '../../auth';
import { Redirect } from 'react-router';

interface IDispatchProps {
    logout: () => void;
}

interface IOwnProps {
    onLoggedIn: () => void;
}

export interface IViewContainerState {
    isFirebaseLoggedIn: boolean;
    loggedIn: boolean;
    isFirebaseLoaded: boolean;
}

export type IViewContainerProps = IDispatchProps & IOwnProps;

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
                    <Link to="/admin"><button className="user-button">Manage Puzzles</button></Link>
                    <Link to="/admin/users"><button className="user-button">Manage Users</button></Link>
                    {this.state.loggedIn && <button className="logout-button" onClick={this.handleLogout}>Logout</button>}
                </div>
                {this.props.children}
            </div>
        );
    }

    private handleLogout = () => {
        this.props.logout();
    }
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        logout: logoutAction,
    }, dispatch);
}

export const ViewContainer = connect(undefined, mapDispatchToProps)(UnconnectedViewContainer);