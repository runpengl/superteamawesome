import { Dispatch } from "redux";

import { firebaseDatabase } from "../auth";
import { loadUserInfo, LOGIN_ACTION } from "./authActions";
import { loadHuntAndUserInfo, ILoadHuntActionPayload, LOAD_HUNT_ACTION } from "./huntActions";
import { IAppState, IAuthState, IUserGroup } from "../state";
import { getDrivePermissions } from "../services";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload, 
    asyncActionSucceededPayload,
    isAsyncLoaded,
} from "./loading";

export const LOAD_USERS_ACTION = "LOAD_USERS";
export function loadUsersAction() {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IUserGroup>(LOAD_USERS_ACTION));
        firebaseDatabase.ref("/userGroups/admin").on("value", (snapshot) => {
            dispatch(asyncActionSucceededPayload<IUserGroup>(LOAD_USERS_ACTION, snapshot.val()));
        }, (error: Error) => {
            dispatch(asyncActionFailedPayload<IUserGroup>(LOAD_USERS_ACTION, error));
        });
    };
}

export const LOAD_ADMIN_USERS_ACTION = "LOAD_ADMIN_USERS";
export function loadAdminUsersAction() {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IUserGroup>(LOAD_ADMIN_USERS_ACTION));
        firebaseDatabase.ref("/userGroups/approved").on("value", (snapshot) => {
            dispatch(asyncActionSucceededPayload<IUserGroup>(LOAD_ADMIN_USERS_ACTION, snapshot.val()));
        }, (error: Error) => {
            dispatch(asyncActionFailedPayload<IUserGroup>(LOAD_ADMIN_USERS_ACTION, error));
        });
    };
}

export function loadUsersAndAuthInfoAction() {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        if (!isAsyncLoaded(getState().hunt)) {
            loadHuntAndUserInfo(dispatch, getState)
                .then(() => {
                    loadAdminUsersAction()(dispatch);
                    loadUsersAction()(dispatch);
                })
                .catch((error: Error) => {
                    let huntLoadError = error;
                    if ((error as any).code === "PERMISSION_DENIED") {
                        huntLoadError = new Error("You aren't authorized to view this page. Please ask a superteamawesome admin to request access");
                        dispatch(asyncActionFailedPayload<IAuthState>(LOGIN_ACTION, huntLoadError));
                    }
                    dispatch(asyncActionFailedPayload<IUserGroup>(LOAD_USERS_ACTION, huntLoadError));
                    dispatch(asyncActionFailedPayload<IUserGroup>(LOAD_ADMIN_USERS_ACTION, huntLoadError));
                    dispatch(asyncActionFailedPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, huntLoadError));
                });
        } else {
            loadUserInfo(dispatch, getState().auth, getState().lifecycle)
                .then(() => {
                    loadAdminUsersAction()(dispatch);
                    loadUsersAction()(dispatch);
                })
                .catch((error: Error) => {
                    let huntLoadError = error;
                    if ((error as any).code === "PERMISSION_DENIED") {
                        huntLoadError = new Error("You aren't authorized to view this page. Please ask a superteamawesome admin to request access");
                        dispatch(asyncActionFailedPayload<IAuthState>(LOGIN_ACTION, huntLoadError));
                    }
                    dispatch(asyncActionFailedPayload<IUserGroup>(LOAD_USERS_ACTION, huntLoadError));
                    dispatch(asyncActionFailedPayload<IUserGroup>(LOAD_ADMIN_USERS_ACTION, huntLoadError));
                });
        }
    };
}

export const BOOTSTRAP_USERS_ACTION = "BOOTSTRAP_USERS";
export function bootstrapUsersAction(driveFolderId: string) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<void>(BOOTSTRAP_USERS_ACTION));
        getDrivePermissions(driveFolderId)
            .then((permissions) => {
                let promises: Promise<void>[] = [];
                permissions.forEach((permission) => {
                    // if the user has write permissions to the drive add them if they're not there already
                    if ((permission.type === "user" || permission.type === "admin") 
                        && (permission.role === "owner" || permission.role === "writer")) {
                        let escapedEmail = permission.emailAddress.toLowerCase().replace(/\./g, "%2E");
                        promises.push(new Promise<void>((resolve, reject) => {
                            firebaseDatabase.ref(`/userGroups/approved/${escapedEmail}`).once("value", (snapshot) => {
                                if (snapshot.val() == null) {
                                    firebaseDatabase.ref(`/userGroups/approved/${escapedEmail}`).set(true).then(() => {
                                        resolve();
                                    }, (error) => {
                                        reject(error);
                                    });
                                } else {
                                    resolve();
                                }
                            }, (error: Error) => {
                                reject(error);
                            })
                        }));
                    }
                });
                return Promise.all(promises);
            })
            .then(() => {
                // users have been added, hooray
                dispatch(asyncActionSucceededPayload<void>(BOOTSTRAP_USERS_ACTION));
            })
            .catch((error) => {
                dispatch(asyncActionFailedPayload<void>(BOOTSTRAP_USERS_ACTION, error));
            });
    }
}