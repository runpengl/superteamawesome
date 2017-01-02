import * as firebase from "firebase";

import { IAsyncLoaded } from "./actions";

export interface IAuthState {
    googleToken?: string;
    user?: firebase.UserInfo;
}

export interface IHuntState {
    domain: string;
    name: string;
    titleRegex?: string;
    year: number;
}

export interface IAppState {
    auth?: IAuthState;
    hunt?: IAsyncLoaded<IHuntState>;
}