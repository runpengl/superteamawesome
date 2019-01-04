import * as React from "react";
import { connect, Dispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { IAppLifecycle, IAppState, IAuthState, IHuntState, IUser, LoginStatus } from "../store/state";
import { IAsyncLoaded, isAsyncLoaded, isAsyncInProgress } from '../store/actions/loading';
import { loadUsersAndAuthInfoAction, bootstrapUsersAction, toggleAdminAccessAction, toggleUserApprovalAction } from '../store/actions/userActions';
import { ViewContainer } from './common/viewContainer';

interface IOwnProps {}
interface IStateProps {
    auth: IAuthState;
    adminUsers: IAsyncLoaded<IUser[]>;
    hunt: IAsyncLoaded<IHuntState>;
    lifecycle: IAppLifecycle;
    users: IAsyncLoaded<IUser[]>;
}

interface IDispatchProps {
    bootstrapUsers: (driveFolderId: string) => void;
    loadUsersAndAuthInfo: () => void;
    toggleAdminAccess: (user: IUser, makeAdmin: boolean) => void;
    toggleUserApproval: (user: IUser, grantAccess: boolean) => void;
}

export interface IUserDashboardProps extends IOwnProps, IStateProps, IDispatchProps {}

class UnconnectedUserDashboard extends React.Component<IUserDashboardProps> {
    public componentDidUpdate(oldProps: IUserDashboardProps) {
        const { bootstrapUsers, hunt } = this.props;
        if (isAsyncLoaded(hunt) && isAsyncInProgress(oldProps.hunt)) {
            bootstrapUsers(hunt.value.driveFolderId);
        }
    }

    public render() {
        return (
            <ViewContainer onLoggedIn={this.handleLogIn}>
                {this.maybeRenderUserInfo()}
            </ViewContainer>
        );
    }

    private handleLogIn = () => {
        if (this.props.lifecycle.loginStatus !== LoginStatus.LOGGED_IN || !isAsyncLoaded(this.props.users)) {
            this.props.loadUsersAndAuthInfo();
        }
    }

    private maybeRenderUserInfo() {
        const { hunt } = this.props;
        if (isAsyncLoaded(hunt)) {
            return (
                <div className="user-dashboard">
                    {this.maybeRenderAdminUsersInfo()}
                    {this.maybeRenderUsersInfo()}
                </div>
            );
        } else {
            return <span>Loading...</span>;
        }
    }

    private maybeRenderAdminUsersInfo() {
        const { adminUsers } = this.props;
        if (isAsyncLoaded(adminUsers)) {
            return (
                <div className="users-container">
                    <h3>Admin Users</h3>
                    {this.renderUsersTable(adminUsers.value.filter((user) => user.hasAccess), true)}
                </div>
            )
        } else {
            return <span>Loading...</span>;
        }
    }

    private maybeRenderUsersInfo() {
        const { users } = this.props;
        if (isAsyncLoaded(users)) {
            return (
                <div className="users-container">
                    <h3>Chrome Extension Users</h3>
                    <b>Needs Approval</b>
                    {this.renderUsersTable(users.value.filter((user) => !user.hasAccess), false)}
                    <b>Approved</b>
                    {this.renderUsersTable(users.value.filter((user) => user.hasAccess), false)}
                </div>
            )
        } else {
            return <span>Loading...</span>;
        }
    }

    private renderUsersTable(users: IUser[], isAdmin: boolean) {
        let userRows = users.map((user) => {
            return (
                <tr key={user.email}>
                    <td><img src={user.photoUrl} width="30px" height="auto" /></td>
                    <td>{user.displayName !== undefined ? user.displayName : "(not available)"}</td>
                    <td><a href={`mailto:${user.email}`}>{user.email}</a></td>
                    {this.maybeRenderAccessButton(user, isAdmin)}
                    {this.maybeRenderAdminButton(user, isAdmin)}
                </tr>
            );
        });

        return (
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>Name</th>
                        <th>Email</th>
                        <th colSpan={isAdmin ? 1 : 2}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {userRows}
                </tbody>
            </table>
        )
    }

    private maybeRenderAccessButton(user: IUser, isAdmin: boolean) {
        let revokeAction = isAdmin ? "Remove Admin" : "Revoke Access";
        const { auth } = this.props;
        if (user.email !== auth.user.email) {
            return (
                <td>
                    <button onClick={this.toggleUserAccess(user, isAdmin)}>
                        {user.hasAccess ? revokeAction : "Grant Access"}
                    </button>
                </td>
            )
        }
        return undefined;
    }

    private maybeRenderAdminButton(user: IUser, isAdmin: boolean) {
        if (!isAdmin) {
            return (
                <td>
                    <button onClick={this.makeUserAdmin(user)}>Make Admin</button>
                </td>
            );
        } else {
            return undefined;
        }
    }

    private makeUserAdmin = (user: IUser) => {
        return () => {
            const { toggleAdminAccess } = this.props;
            toggleAdminAccess(user, true);
        }
    }

    private toggleUserAccess = (user: IUser, isAdmin: boolean) => {
        return () => {
            const { toggleAdminAccess, toggleUserApproval } = this.props;
            if (!isAdmin) {
                toggleUserApproval(user, !user.hasAccess);
            } else {
                toggleAdminAccess(user, false);
            }
        }
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    return {
        adminUsers: state.adminUsers,
        auth: state.auth,
        hunt: state.hunt,
        lifecycle: state.lifecycle,
        users: state.users,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        loadUsersAndAuthInfo: loadUsersAndAuthInfoAction,
        bootstrapUsers: bootstrapUsersAction,
        toggleAdminAccess: toggleAdminAccessAction,
        toggleUserApproval: toggleUserApprovalAction,
    }, dispatch);
}

export const UserDashboard = connect(mapStateToProps, mapDispatchToProps)(UnconnectedUserDashboard);