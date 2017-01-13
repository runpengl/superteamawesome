/// <reference path="../typings/custom/gapi.d.ts" />

import * as React from "react";
import { InjectedRouter } from "react-router";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";
import { IGoogleDriveFile } from "gapi";

import {
    IAsyncLoaded,
    isAsyncFailed,
    isAsyncInProgress,
    isAsyncLoaded,
    loadHuntAndUserInfoAction,
    logoutAction,
    saveHuntInfoAction,
    loadIgnoredPagesAction,
    loadDiscoveredPagesAction,
} from "./actions";
import { firebaseAuth } from "./auth";
import { DiscoveredPages, Puzzles } from "./puzzles";
import { IAppLifecycle, IAppState, IDiscoveredPage, IHuntState, LoginStatus } from "./state";
import { getSlackAuthUrl } from "./services";

interface IAdminDashboardState {
    hasChanges?: boolean;
    hunt?: IHuntState;
    huntDriveFolder?: IGoogleDriveFile;
    isCurrentDriveFolderRoot?: boolean;
    isFirebaseLoggedIn?: boolean;
    isFolderDialogShown?: boolean;
    isLoading?: boolean;
    loggedIn?: boolean;
    loginError?: Error;
}

interface IRouterContext {
    router: InjectedRouter;
}

interface IOwnProps {}

interface IDispatchProps {
    loadHuntAndUserInfo: () => void;
    loadIgnoredPages: (huntKey: string) => void;
    loadDiscoveredPages: (huntKey: string) => void;
    logout: () => void;
    saveHuntInfo: (hunt: IHuntState) => void;
}

interface IStateProps {
    discoveredPages: IAsyncLoaded<IDiscoveredPage[]>;
    hunt: IAsyncLoaded<IHuntState>;
    huntDriveFolder: IAsyncLoaded<IGoogleDriveFile>;
    ignoredPages: IAsyncLoaded<IDiscoveredPage[]>;
    lifecycle: IAppLifecycle;
    slackToken?: string;
    user: firebase.UserInfo;
}

interface IAdminDashboardProps extends IOwnProps, IDispatchProps, IStateProps {}

class UnconnectedAdminDashboard extends React.Component<IAdminDashboardProps, IAdminDashboardState> {
    public state: IAdminDashboardState = {
        isFirebaseLoggedIn: false,
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
                this.setState({ isFirebaseLoggedIn: true });
            }
        });
    }

    public componentDidUpdate(oldProps: IAdminDashboardProps) {
        const { hunt, huntDriveFolder, lifecycle, loadHuntAndUserInfo, loadIgnoredPages, loadDiscoveredPages, slackToken } = this.props;

        if (slackToken === undefined && lifecycle.loginStatus === LoginStatus.LOGGED_IN) {
            (window as any).location = getSlackAuthUrl();
        } else if (slackToken !== undefined && lifecycle.loginStatus === LoginStatus.LOGGED_IN && !isAsyncLoaded(hunt) && !isAsyncInProgress(hunt)) {
            this.setState({
                loggedIn: true,
            });
            loadHuntAndUserInfo();
        }

        if (this.state.isFirebaseLoggedIn && !this.state.loggedIn) {
            this.setState({
                loggedIn: true,
            });
            loadHuntAndUserInfo();
        }
        
        if (lifecycle.loginStatus === LoginStatus.LOGGED_IN && oldProps.lifecycle.loginStatus !== LoginStatus.LOGGED_IN) {
            this.setState({
                loggedIn: true,
            });
        }

        if (isAsyncInProgress(oldProps.hunt) && isAsyncLoaded(hunt)) {
            const hunt = this.props.hunt.value;
            loadIgnoredPages(hunt.year);
            loadDiscoveredPages(hunt.year);
            this.setState({
                hunt,
                isLoading: false,
                isCurrentDriveFolderRoot: hunt.driveFolderId === undefined,
            });
        } else if (isAsyncFailed(hunt) && isAsyncInProgress(oldProps.hunt)) {
            this.setState({ isLoading: false });
        }

        if (isAsyncInProgress(oldProps.huntDriveFolder) && isAsyncLoaded(huntDriveFolder)) {
            this.setState({
                huntDriveFolder: huntDriveFolder.value,
            });
        }

        if (oldProps.lifecycle.deletingPuzzleFailure === undefined && this.props.lifecycle.deletingPuzzleFailure !== undefined) {
            alert(this.props.lifecycle.deletingPuzzleFailure.message);
        }
    }

    public render() {
        const { hunt, lifecycle } = this.props;
        if (this.state.isLoading || (isAsyncFailed(hunt) && lifecycle.loginError !== undefined)) {
            return (
                <div className="dashboard">
                    <div className="header">
                        <div className="header-container">
                            <h1>STAPH [ADMIN]</h1>
                            <div className="sub-header">Super Team Awesome Puzzle Helper</div>
                        </div>
                        {lifecycle.loginError === undefined ? <button className="user-button" onClick={this.routeToUsersPage}>Manage Users</button> : undefined}
                        <button className="logout-button" onClick={this.handleLogout}>Logout</button>
                    </div>
                    <span>{ lifecycle.loginError !== undefined ? lifecycle.loginError.message : "Loading..." }</span>
                </div>
            );
        } else {
            if (isAsyncFailed(hunt)) {
                return <span>Error: {hunt.error.message}</span>;
            } else if (this.state.loggedIn) {
                return this.renderDashboard();
            } else {
                // shouldn't get here
                return <span>Please login</span>;
            }
        }
    }

    private handleHuntDomainChange = (event: React.FormEvent<HTMLInputElement>) => {
        const newValue = (event.target as HTMLInputElement).value;
        if (newValue !== this.props.hunt.value.domain) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { domain: newValue }),
            });
        }
    }

    private handleHuntNameChange = (event: React.FormEvent<HTMLInputElement>) => {
        const newValue = (event.target as HTMLInputElement).value;
        if (newValue !== this.props.hunt.value.name) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { name: newValue }),
            });
        }
    }

    private handleHuntTitleRegexChange = (event: React.FormEvent<HTMLInputElement>) => {
        const newValue = (event.target as HTMLInputElement).value;
        if (newValue !== this.props.hunt.value.titleRegex) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { titleRegex: newValue }),
            });
        }
    }

    private handleHuntDriveFolderChange = (event: React.FormEvent<HTMLInputElement>) => {
        const newValue = (event.target as HTMLInputElement).value;
        const folderIdRegex = new RegExp(/https:\/\/drive.google.com\/drive\/folders\/(.+)$/g);
        const matches = folderIdRegex.exec(newValue);
        if (matches != null && matches.length > 1 && matches[1] !== this.props.hunt.value.driveFolderId) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { driveFolderId: matches[1] }),
            });
        } 
    }

    private handleTemplateSheetChange = (event: React.FormEvent<HTMLInputElement>) => {
        const newValue = (event.target as HTMLInputElement).value;
        const sheetIdRegex = new RegExp(/https:\/\/docs.google.com\/spreadsheets\/d\/(.+)\/.+/g);
        const matches = sheetIdRegex.exec(newValue);
        if (matches.length > 1 && matches[1] !== this.props.hunt.value.templateSheetId) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { templateSheetId: matches[1] }),
            });
        }
    }

    private handleSave = () => {
        this.props.saveHuntInfo(this.state.hunt);
        this.setState({ hasChanges: false });
    }

    private handleLogout = () => {
        const { logout } = this.props;
        this.setState({ loggedIn: false, isLoading: true });
        logout();
    }

    private routeToUsersPage = () => {
        this.context.router.push("/admin/users");
    }

    private renderDashboard() {
        const hunt = this.props.hunt.value;
        return (
            <div className="dashboard">
                <div className="header">
                    <div className="header-container">
                        <h1>STAPH [ADMIN]</h1>
                        <div className="sub-header">Super Team Awesome Puzzle Helper</div>
                    </div>
                    <button className="user-button" onClick={this.routeToUsersPage}>Manage Users</button>
                    <button className="logout-button" onClick={this.handleLogout}>Logout</button>
                </div>
                <div className="hunt-edit-container">
                    <div className="hunt-information">
                        <div className="edit-info-line">
                            <label>Hunt Name</label>
                            <input type="text" defaultValue={hunt.name} onChange={this.handleHuntNameChange} />
                        </div>
                        <div className="edit-info-line">
                            <label>url to match</label>
                            <input type="text" defaultValue={hunt.domain} onChange={this.handleHuntDomainChange} />
                        </div>
                        <div className="edit-info-line">
                            <label>match title</label>
                            <input type="text" defaultValue={hunt.titleRegex} onChange={this.handleHuntTitleRegexChange} />
                        </div>
                        <div className="edit-info-line">
                            <label>google drive folder</label>
                            <input type="text" defaultValue={this.getHuntFolderLink()} onChange={this.handleHuntDriveFolderChange} />
                        </div>
                        <div className="edit-info-line">
                            <label>spreadsheet template</label>
                            <input type="text" defaultValue={this.getTemplateSheetLink()} onChange={this.handleTemplateSheetChange} />
                        </div>
                    </div>
                    <button
                        className="hunt-save-button"
                        disabled={!this.state.hasChanges}
                        onClick={this.handleSave}
                    >
                        { this.state.hasChanges ? "Save" : "Saved" }
                    </button>
                </div>
                {this.maybeRenderPuzzles()}
            </div>
        )
    }

    private getTemplateSheetLink() {
        const { hunt } = this.state;
        if (hunt.templateSheetId === undefined) {
            return undefined;
        } else {
            return `https://docs.google.com/spreadsheets/d/${hunt.templateSheetId}/edit`;
        }
    }

    private getHuntFolderLink() {
        const { hunt } = this.state;
        if (hunt.driveFolderId === undefined) {
            return undefined;
        } else {
            return `https://drive.google.com/drive/u/0/folders/${hunt.driveFolderId}`;
        }
    }

    private maybeRenderPuzzles() {
        const { discoveredPages, hunt, ignoredPages, slackToken } = this.props;
        if (slackToken !== undefined) {
            return (
                <div className="tables-container">
                    <DiscoveredPages hunt={hunt.value} discoveredPages={discoveredPages} title="discovered"/>
                    <Puzzles huntKey={hunt.value.year} slackTeamId={hunt.value.slackTeamId} />
                    <DiscoveredPages
                        hunt={hunt.value}
                        discoveredPages={ignoredPages}
                        title="ignored"
                        hideIgnoreButton={true}
                        isInitallyCollapsed={true}
                    />
                </div>
            );
        } else {
            return (
                <div>
                    <a href={getSlackAuthUrl()}>Login</a> to Slack to manage puzzles
                </div>
            );
        }
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    const { auth, discoveredPages, huntDriveFolder, hunt, ignoredPages, lifecycle } = state;
    return {
        discoveredPages,
        hunt,
        huntDriveFolder,
        ignoredPages,
        lifecycle,
        slackToken: auth.slackToken,
        user: auth.user,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        loadDiscoveredPages: loadDiscoveredPagesAction,
        loadHuntAndUserInfo: loadHuntAndUserInfoAction,
        loadIgnoredPages: loadIgnoredPagesAction,
        logout: logoutAction,
        saveHuntInfo: saveHuntInfoAction,
    }, dispatch);
}

export const AdminDashboard = connect(mapStateToProps, mapDispatchToProps)(UnconnectedAdminDashboard);
