/// <reference path="../typings/custom/gapi.d.ts" />

import * as React from "react";
import { InjectedRouter } from "react-router";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";
import { IGoogleDriveFile } from "gapi";

import {
    IAsyncLoaded,
    isAsyncLoaded,
    loadHuntAndUserInfoAction,
    logoutAction,
    saveHuntInfoAction,
    loadIgnoredPagesAction,
    loadDiscoveredPagesAction,
} from "./actions";
import { firebaseAuth } from "./auth";
import { DiscoveredPages, Puzzles } from "./puzzles";
import { IAppState, IDiscoveredPage, IHuntState } from "./state";
import { getSlackAuthUrl } from "./services";

interface IAdminDashboardState {
    hasChanges?: boolean;
    hunt?: IHuntState;
    huntDriveFolder?: IGoogleDriveFile;
    isCurrentDriveFolderRoot?: boolean;
    isFolderDialogShown?: boolean;
    isLoading?: boolean;
    loggedIn?: boolean;
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
    slackToken?: string;
}

interface IAdminDashboardProps extends IOwnProps, IDispatchProps, IStateProps {}

class UnconnectedAdminDashboard extends React.Component<IAdminDashboardProps, IAdminDashboardState> {
    public state: IAdminDashboardState = {
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

    public componentDidUpdate(oldProps: IAdminDashboardProps) {
        const { hunt, huntDriveFolder, loadIgnoredPages, loadDiscoveredPages } = this.props;

        if (!isAsyncLoaded(oldProps.hunt) && isAsyncLoaded(hunt)) {
            const hunt = this.props.hunt.value;
            loadIgnoredPages(hunt.year);
            loadDiscoveredPages(hunt.year);
            this.setState({
                hunt,
                isLoading: false,
                isCurrentDriveFolderRoot: hunt.driveFolderId === undefined,
            });
        }

        if (!isAsyncLoaded(oldProps.huntDriveFolder) && isAsyncLoaded(huntDriveFolder)) {
            this.setState({
                huntDriveFolder: huntDriveFolder.value,
            });
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
        const folderIdRegex = new RegExp(/https:\/\/drive.google.com\/drive\/u\/0\/folders\/(.+)$/g);
        const matches = folderIdRegex.exec(newValue);
        if (matches.length > 1 && matches[1] !== this.props.hunt.value.driveFolderId) {
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
        logout();
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
    const { auth, discoveredPages, huntDriveFolder, hunt, ignoredPages } = state;
    return {
        discoveredPages,
        hunt,
        huntDriveFolder,
        ignoredPages,
        slackToken: auth.slackToken,
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
