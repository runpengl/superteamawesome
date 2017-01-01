import * as firebase from "firebase";

export interface IAuthState {
    googleToken?: string;
    user?: firebase.UserInfo;
}

export interface IAppState {
    auth?: IAuthState;
}