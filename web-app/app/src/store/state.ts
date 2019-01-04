/// <reference path="../../typings/custom/gapi.d.ts" />

import * as firebase from "firebase";
import { IGoogleDriveFile } from "gapi";

import { RouterState } from "connected-react-router";
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
}

export interface IDiscoveredPage {
    host: string;
    key: string;
    ignored?: boolean;
    path: string;
    title: string;
}

export type PuzzleStatus = "inProgress" | "solved" | "new" | "stuck";
export const PuzzleStatus = {
    IN_PROGRESS: "inProgress" as PuzzleStatus,
    NEW: "new" as PuzzleStatus,
    SOLVED: "solved" as PuzzleStatus,
    STUCK: "stuck" as PuzzleStatus,
};

export interface IPuzzleGroup {
    parent: IPuzzle;
    children: IPuzzle[];
}

export interface IPuzzleHierarchy {
    [key: string]: IPuzzleGroup;
}

export interface IPuzzle {
    createdAt: string;
    host: string;
    hunt: string;
    ignoreLink?: boolean;
    index?: number;
    isMeta?: boolean;
    key?: string;
    name: string;
    parent?: string;
    path: string;
    slackChannel: string;
    slackChannelId: string;
    solution?: string;
    spreadsheetId: string;
    status: PuzzleStatus;
}

export interface IUser {
    hasAccess?: boolean;
    displayName?: string;
    email: string;
    escapedEmail: string;
    photoUrl?: string;
}

export interface IAppLifecycle {
    createPuzzleFailure?: Error;
    creatingManualPuzzle?: boolean;
    createManualPuzzleFailure?: Error;
    deletingPuzzleIds?: string[];
    deletingPuzzleFailure?: Error;
    loginError?: Error;
    loginStatus?: LoginStatus;
}

export enum LoginStatus {
    NONE,
    LOGGING_IN,
    LOGGED_IN,
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
}
