/// <reference path="../../typings/custom/gapi.d.ts" />

import * as React from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";
import { IGoogleDriveFile } from "gapi";
import { IAppLifecycle, IAppState, IDiscoveredPage, IHuntState } from '../store/state';
import { IAsyncLoaded, isAsyncLoaded, isAsyncInProgress, isAsyncFailed } from '../store/actions/loading';
import { loadDiscoveredPagesAction, loadIgnoredPagesAction } from '../store/actions/puzzleActions';
import { loadHuntAndUserInfoAction, saveHuntInfoAction } from '../store/actions/huntActions';
import { logoutAction } from '../store/actions/authActions';
import { DiscoveredPages } from '../puzzles/discoveredPages';
import { Puzzles } from '../puzzles/puzzles';
import { getSlackAuthUrl } from '../services/slackService';
import { ViewContainer } from "./common/viewContainer";

interface IAdminDashboardState {
    hasChanges?: boolean;
    hunt?: IHuntState;
    huntDriveFolder?: IGoogleDriveFile;
    isCurrentDriveFolderRoot?: boolean;
    isFolderDialogShown?: boolean;
    loginError?: Error;
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
    public state: IAdminDashboardState = {};

    public componentWillReceiveProps(nextProps: IAdminDashboardProps) {
        const { hunt, huntDriveFolder, loadIgnoredPages, loadDiscoveredPages } = nextProps;

        if (!isAsyncLoaded(this.props.hunt) && isAsyncLoaded(hunt)) {
            const hunt = nextProps.hunt.value;
            loadIgnoredPages(hunt.year);
            loadDiscoveredPages(hunt.year);
            this.setState({
                hunt,
                isCurrentDriveFolderRoot: hunt.driveFolderId === undefined,
            });
        }

        if (isAsyncInProgress(this.props.huntDriveFolder) && isAsyncLoaded(huntDriveFolder)) {
            this.setState({
                huntDriveFolder: huntDriveFolder.value,
            });
        }

        if (this.props.lifecycle.deletingPuzzleFailure === undefined && nextProps.lifecycle.deletingPuzzleFailure !== undefined) {
            alert(this.props.lifecycle.deletingPuzzleFailure.message);
        }
    }

    public render() {
        return (
            <ViewContainer onLoggedIn={this.handleLogIn} isContentReady={isAsyncLoaded(this.props.hunt) || isAsyncInProgress(this.props.hunt)}>
                {this.maybeRenderHunt()}
            </ViewContainer>
        )
    }

    private maybeRenderHunt() {
        const { hunt, lifecycle } = this.props;
        if (!isAsyncLoaded(hunt) || (isAsyncFailed(hunt) && lifecycle.loginError !== undefined)) {
            return <span>{ lifecycle.loginError !== undefined ? lifecycle.loginError.message : "Loading..." }</span>;
        } else if (isAsyncFailed(hunt)) {
            return <span>Error: {hunt.error.message}</span>;
        } else {
            return this.renderDashboard();
        }
    }

    private handleLogIn = () => {
        this.props.loadHuntAndUserInfo();
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
                hunt: {
                    ...this.state.hunt, 
                    templateSheetId: matches[1],
                },
            });
        }
    }

    private handleSave = () => {
        this.props.saveHuntInfo(this.state.hunt);
        this.setState({ hasChanges: false });
    }

    private renderDashboard() {
        const hunt = this.props.hunt.value;
        return (
            <>
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
            </>
        )
    }

    private getTemplateSheetLink() {
        const { hunt } = this.state;
        if (!isAsyncLoaded(this.props.hunt) || hunt === undefined || hunt.templateSheetId === undefined) {
            return undefined;
        } else {
            return `https://docs.google.com/spreadsheets/d/${hunt.templateSheetId}/edit`;
        }
    }

    private getHuntFolderLink() {
        const { hunt } = this.state;
        if (!isAsyncLoaded(this.props.hunt) || hunt === undefined || hunt.driveFolderId === undefined) {
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
