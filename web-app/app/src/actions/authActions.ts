import { Dispatch } from "redux";
import * as firebase from "firebase";

import { firebaseAuth, firebaseDatabase } from "../auth";
import { IAppLifecycle, IAppState, IAuthState, LoginStatus } from "../state";
import { loadGoogleApi, reloadGoogleAuth } from "../services";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload, 
    asyncActionSucceededPayload,
} from "./loading";

export function loadUserInfo(dispatch: Dispatch<IAppState>, authState: IAuthState, lifecycle: IAppLifecycle) {
    let authPromise = new Promise((resolve) => {
        firebaseAuth().onAuthStateChanged((user: firebase.UserInfo) => resolve(user));
    });

    let googleToken: string;
    let user: firebase.UserInfo;
    let userPrivateInfo: IUserPrivateData;
    if (authState.user === undefined) {
        return authPromise
            .then((firebaseUser: firebase.UserInfo) => {
                user = firebaseUser;

                const escapedEmail = user.email.replace(/\./g, "%2E");
                return new Promise<void>((resolve, reject) => {
                    firebaseDatabase.ref(`userGroups/admin/${escapedEmail}`).once("value", (snapshot) => {
                        if (snapshot.val()) {
                            resolve();
                        } else {
                            throw new Error("You aren't authorized to view this page. Please ask a superteamawesome admin to request access");
                        }
                    }, (error: Error) => {
                        reject(error);
                    });
                })
            }).then(() => {
                if (lifecycle.loginStatus === LoginStatus.NONE) {
                    return reloadGoogleAuth();
                } else {
                    return new Promise((resolve) => resolve());
                }
            })
            .then((googleAccessToken: string) => {
                googleToken = googleAccessToken;
                return getAccessTokens(user.uid);
            })
            .then((userInfo: IUserPrivateData) => {
                userPrivateInfo = userInfo;
                if (googleToken === undefined) {
                    googleToken = userPrivateInfo.googleAccessToken;
                }
                return loadGoogleApi(googleToken);
            })
            .then(() => {
                dispatch(asyncActionSucceededPayload<IAuthState>(
                    LOGIN_ACTION,
                    {
                        googleToken,
                        slackToken: userPrivateInfo.slackAccessToken,
                        user,
                    }
                ));
                return new Promise((resolve) => resolve(userPrivateInfo.slackAccessToken));
            });
    } else {
        return getAccessTokens(authState.user.uid).then((privateInfo) => privateInfo.slackAccessToken);
    }
}

export const LOGIN_ACTION = "LOGIN";
export function loginAction(accessToken: string) {
    return (dispatch: Dispatch<IAppState>, _getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<IAuthState>(LOGIN_ACTION));

        let user: firebase.UserInfo;
        const credential = firebase.auth.GoogleAuthProvider.credential(null, accessToken);
        firebaseAuth().signInWithCredential(credential)
            .then((result) => {
                // The signed-in user info.
                user = result;

                const escapedEmail = user.email.replace(/\./g, "%2E");
                return new Promise<void>((resolve, reject) => {
                    firebaseDatabase.ref(`userGroups/admin/${escapedEmail}`).once("value", (snapshot) => {
                        if (snapshot.val()) {
                            resolve();
                        } else {
                            throw new Error("You aren't authorized to view this page. Please ask a superteamawesome admin to request access");
                        }
                    }, (error: Error) => {
                        if ((error as any).code === "PERMISSION_DENIED") {
                            reject(new Error("You aren't authorized to view this page. Please ask a superteamawesome admin to request access"));
                        } else {
                            reject(error);
                        }
                    });
                });
            }).then(() => {
                return loadGoogleApi(accessToken);
            })
            .then(() => {
                return getAccessTokens(user.uid);
            })
            .then((userPrivateInfo: IUserPrivateData) => {
                firebaseDatabase.ref(`userPrivateData/${user.uid}/googleAccessToken`).set(accessToken);
                firebaseDatabase.ref(`users/${user.uid}`).set({
                    displayName: user.displayName,
                    photoUrl: user.photoURL,
                    email: user.email,
                });

                dispatch(asyncActionSucceededPayload<IAuthState>(
                    LOGIN_ACTION,
                    {
                        googleToken: accessToken,
                        slackToken: userPrivateInfo != null ? userPrivateInfo.slackAccessToken : undefined,
                        user,
                    }
                ));
            })
            .catch((error) => {
                dispatch(asyncActionFailedPayload<IAuthState>(LOGIN_ACTION, error));
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

export function getAccessTokens(userUid: string): Promise<IUserPrivateData> {
    return new Promise((resolve) => {
        firebaseDatabase
            .ref(`userPrivateData/${userUid}`)
            .once("value", (snapshot: firebase.database.DataSnapshot) => {
                const userInfo = snapshot.val() as IUserPrivateData;
                resolve(userInfo);
            });
    });
}
