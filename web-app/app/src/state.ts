import * as firebase from "firebase";

export interface IAppState {
    googleToken?: string;
    user?: firebase.UserInfo;
}