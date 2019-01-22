/// <reference path="../../typings/custom/gapi.d.ts" />

import * as firebase from "firebase";
import { IGoogleDriveFile } from "gapi";

import { RouterState } from "connected-react-router";
import { IDiscoveredPage, IPuzzle } from "../../../server/api/puzzleApi";
import { IAsyncLoaded } from "./actions/loading";

export interface IAuthState {
    googleToken?: string;
    slackToken?: string;
    user?: firebase.UserInfo;
}

export interface IHuntState {
    domain: string;
    name: string;
    driveFolderId?: string;
    slackTeamId?: string;
    templateSheetId?: string;
    titleRegex?: string;
    year: string;
    isCurrent: boolean;
}

export interface IPuzzleGroup {
    parent: IPuzzle;
    children: IPuzzle[];
}

export interface IPuzzleHierarchy {
    [key: string]: IPuzzleGroup;
}

export interface IUser {
    hasAccess?: boolean;
    displayName?: string;
    email: string;
    escapedEmail: string;
    photoUrl?: string;
}

export interface IAppLifecycle {
    createdSinglePuzzle: IAsyncLoaded<void>;
    createPuzzleFailure?: Error;
    creatingManualPuzzle?: boolean;
    createManualPuzzleFailure?: Error;
    deletingPuzzleIds?: string[];
    deletingPuzzleFailure?: Error;
    loginError?: Error;
    loginStatus?: LoginStatus;
    addingNewHunt: IAsyncLoaded<void>;
    savingHuntInfo: IAsyncLoaded<void>;
}

export enum LoginStatus {
    NONE,
    LOGGING_IN,
    LOGGED_IN,
    LOGGED_OUT,
}

export interface IAppState {
    adminUsers?: IAsyncLoaded<IUser[]>;
    router?: RouterState;
    auth?: IAuthState;
    discoveredPages?: IAsyncLoaded<IDiscoveredPage[]>;
    activeHunt?: IAsyncLoaded<IHuntState>;
    huntDriveFolder?: IAsyncLoaded<IGoogleDriveFile>;
    ignoredPages?: IAsyncLoaded<IDiscoveredPage[]>;
    lifecycle?: IAppLifecycle;
    puzzles?: IAsyncLoaded<IPuzzle[]>;
    users?: IAsyncLoaded<IUser[]>;
    hunts: IAsyncLoaded<{ [key: string]: IHuntState }>;
}
