import * as firebase from "firebase";
import { IGoogleDriveFile } from "gapi";

import { IAsyncLoaded } from "./actions";

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

export type PuzzleStatus = "inProgress" | "solved" | "new";
export const PuzzleStatus = {
    IN_PROGRESS: "inProgress" as PuzzleStatus,
    NEW: "new" as PuzzleStatus,
    SOLVED: "solved" as PuzzleStatus,
}
export interface IPuzzle {
    createdAt: string;
    hunt: string;
    index?: number;
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

export interface IAppState {
    auth?: IAuthState;
    discoveredPages?: IAsyncLoaded<IDiscoveredPage[]>;
    hunt?: IAsyncLoaded<IHuntState>;
    huntDriveFolder?: IAsyncLoaded<IGoogleDriveFile>;
    ignoredPages?: IAsyncLoaded<IDiscoveredPage[]>;
    puzzles?: IAsyncLoaded<IPuzzle[]>;
}
