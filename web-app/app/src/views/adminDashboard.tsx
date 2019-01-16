/// <reference path="../../typings/custom/gapi.d.ts" />

import { IGoogleDriveFile } from "gapi";
import * as React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { bindActionCreators, Dispatch } from "redux";
import { IDiscoveredPage } from "../../../server/api/puzzleApi";
import { DiscoveredPages } from "../puzzles/discoveredPages";
import { Puzzles } from "../puzzles/puzzles";
import { getSlackAuthUrl } from "../services/slackService";
import { logoutAction } from "../store/actions/authActions";
import { loadHuntAndUserInfoAction } from "../store/actions/huntActions";
import { IAsyncLoaded, isAsyncFailed, isAsyncInProgress, isAsyncLoaded } from "../store/actions/loading";
import { loadDiscoveredPagesAction, loadIgnoredPagesAction } from "../store/actions/puzzleActions";
import { IAppLifecycle, IAppState, IHuntState } from "../store/state";
import { ViewContainer } from "./common/viewContainer";

interface IAdminDashboardState {
    hasChanges?: boolean;
    hunt?: IHuntState;
    huntDriveFolder?: IGoogleDriveFile;
    isCurrentDriveFolderRoot?: boolean;
    isFolderDialogShown?: boolean;
    loginError?: Error;
}

interface IDispatchProps {
    loadHuntAndUserInfo: () => void;
    loadIgnoredPages: (huntKey: string) => void;
    loadDiscoveredPages: (huntKey: string) => void;
    logout: () => void;
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

interface IAdminDashboardProps extends IDispatchProps, IStateProps {}

class UnconnectedAdminDashboard extends React.Component<IAdminDashboardProps, IAdminDashboardState> {
    public state: IAdminDashboardState = {};

    public componentWillReceiveProps(nextProps: IAdminDashboardProps) {
        const { huntDriveFolder, loadIgnoredPages, loadDiscoveredPages } = nextProps;

        if (!isAsyncLoaded(this.props.hunt) && isAsyncLoaded(nextProps.hunt)) {
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

        if (
            this.props.lifecycle.deletingPuzzleFailure === undefined &&
            nextProps.lifecycle.deletingPuzzleFailure !== undefined
        ) {
            alert(this.props.lifecycle.deletingPuzzleFailure.message);
        }
    }

    public render() {
        return (
            <ViewContainer
                onLoggedIn={this.handleLogIn}
                isContentReady={isAsyncLoaded(this.props.hunt) || isAsyncInProgress(this.props.hunt)}
            >
                {this.maybeRenderHunt()}
            </ViewContainer>
        );
    }

    private maybeRenderHunt() {
        const { hunt, lifecycle } = this.props;
        if (!isAsyncLoaded(hunt) || (isAsyncFailed(hunt) && lifecycle.loginError !== undefined)) {
            return <span>{lifecycle.loginError !== undefined ? lifecycle.loginError.message : "Loading..."}</span>;
        } else if (isAsyncFailed(hunt)) {
            return <span>Error: {hunt.error.message}</span>;
        } else {
            return (
                <div>
                    <div>
                        <b className="hunt-label">Current hunt:</b>
                        <Link to="/admin/hunts">{hunt.value.name}</Link>
                    </div>
                    {this.maybeRenderPuzzles()}
                </div>
            );
        }
    }

    private handleLogIn = () => {
        this.props.loadHuntAndUserInfo();
    };

    private maybeRenderPuzzles() {
        const { discoveredPages, hunt, ignoredPages, slackToken } = this.props;
        if (slackToken !== undefined) {
            return (
                <div className="tables-container">
                    <DiscoveredPages hunt={hunt.value} discoveredPages={discoveredPages} title="discovered" />
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

function mapStateToProps(state: IAppState): IStateProps {
    const { auth, discoveredPages, huntDriveFolder, activeHunt: hunt, ignoredPages, lifecycle } = state;
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
    return bindActionCreators(
        {
            loadDiscoveredPages: loadDiscoveredPagesAction,
            loadHuntAndUserInfo: loadHuntAndUserInfoAction,
            loadIgnoredPages: loadIgnoredPagesAction,
            logout: logoutAction,
        },
        dispatch,
    );
}

export const AdminDashboard = connect(
    mapStateToProps,
    mapDispatchToProps,
)(UnconnectedAdminDashboard);
