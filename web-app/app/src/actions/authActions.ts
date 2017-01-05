import { Dispatch } from "redux";
import * as firebase from "firebase";

import { firebaseAuth, firebaseDatabase, provider } from "../auth";
import { IAppState } from "../state";
import { loadGoogleApi } from "./googleActions";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload, 
    asyncActionSucceededPayload,
} from "./loading";

export const LOGIN_ACTION = "LOGIN";
export interface ILoginActionPayload {
    googleToken: string;
    user: firebase.UserInfo;
}

export function loginAction() {
    return (dispatch: Dispatch<IAppState>, _getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<ILoginActionPayload>(LOGIN_ACTION));

        let token: string;
        let user: firebase.UserInfo;
        firebaseAuth().signInWithPopup(provider)
            .then((result) => {
                // This gives you a Google Access Token. You can use it to access the Google API.
                token = result.credential.accessToken;

                // The signed-in user info.
                user = result.user;
                
                return loadGoogleApi(token, (user as any).refreshToken);
            })
            .then(() => {
                firebaseDatabase.ref(`userPrivateData/${user.uid}`).set({
                    googleAccessToken: token,
                });

                firebaseDatabase.ref(`users/${user.uid}`).set({
                    displayName: user.displayName,
                    photoUrl: user.photoURL,
                });

                dispatch(asyncActionSucceededPayload<ILoginActionPayload>(
                    LOGIN_ACTION,
                    {
                        googleToken: token,
                        user,
                    }
                ));
            })
            .catch((error) => {
                dispatch(asyncActionFailedPayload<ILoginActionPayload>(LOGIN_ACTION, error));
            });
    }
}

export const LOGOUT_ACTION = "LOGOUT";
export interface ILogoutActionPayload {}

export function logoutAction() {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<ILogoutActionPayload>(LOGOUT_ACTION));
        firebaseAuth().signOut()
            .then(() => {
                dispatch(asyncActionSucceededPayload<ILogoutActionPayload>(LOGOUT_ACTION, {}));
            })
            .catch((error) => {
                dispatch(asyncActionFailedPayload<ILogoutActionPayload>(LOGOUT_ACTION, error));
            });
    }
}

export interface IUserPrivateData {
    googleAccessToken: string;
    slackAccessToken: string;
}

export function getAccessToken(userUid: string) {
    return new Promise((resolve) => {
        firebaseDatabase
            .ref(`userPrivateData/${userUid}`)
            .once("value", (snapshot: firebase.database.DataSnapshot) => {
                const userInfo = snapshot.val() as IUserPrivateData;
                resolve(userInfo.googleAccessToken);
            });
    });
}
