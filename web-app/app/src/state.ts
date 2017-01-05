import * as firebase from "firebase";
import { IGoogleDriveFile } from "gapi";

import { IAsyncLoaded } from "./actions";

export interface IAuthState {
    googleToken?: string;
    user?: firebase.UserInfo;
}

export interface IHuntState {
    domain: string;
    name: string;
    driveFolderId?: string;
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

export interface IAppState {
    auth?: IAuthState;
    discoveredPages?: IAsyncLoaded<IDiscoveredPage[]>;
    hunt?: IAsyncLoaded<IHuntState>;
    huntDriveFolder?: IAsyncLoaded<IGoogleDriveFile>;
}
