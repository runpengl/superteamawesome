import { Dispatch } from "redux";

import { firebaseDatabase } from "../auth";
import { loadUserInfo, LOGIN_ACTION } from "./authActions";
import { loadHuntAndUserInfo, ILoadHuntActionPayload, LOAD_HUNT_ACTION } from "./huntActions";
import { IAppState, IAuthState, IUser } from "../state";
import { getDrivePermissions } from "../services";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload, 
    asyncActionSucceededPayload,
    isAsyncLoaded,
} from "./loading";

export const LOAD_USERS_ACTION = "LOAD_USERS";
export const LOAD_ADMIN_USERS_ACTION = "LOAD_ADMIN_USERS";

export function loadUsers() {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IUser[]>(LOAD_USERS_ACTION));
        dispatch(asyncActionInProgressPayload<IUser[]>(LOAD_ADMIN_USERS_ACTION));
        firebaseDatabase.ref("/users").on("value", (usersSnapshot) => {
            let users: IUser[] = [];
            usersSnapshot.forEach((userSnapshot) => {
                let user = userSnapshot.val() as IUser;
                let escapedEmail = user.email.toLowerCase().replace(/\./g, "%2E");
                users.push(Object.assign({}, user, { escapedEmail }));
                return false;
            });
            let adminUsers = users.slice();
            firebaseDatabase.ref("/userGroups/approved").once("value")
                .then((approvedUsersSnapshot: firebase.database.DataSnapshot) => {
                    approvedUsersSnapshot.forEach((approvedUser) => {
                        let userIndex = users.findIndex((user) => user.escapedEmail === approvedUser.key);
                        if (userIndex < 0) {
                            users.push({
                                hasAccess: approvedUser.val(),
                                email: approvedUser.key.replace(/\%2E/g, "."),
                                escapedEmail: approvedUser.key,
                            });
                        } else {
                            users[userIndex].hasAccess = approvedUser.val();
                        }
                        return false;
                    });
                    dispatch(asyncActionSucceededPayload<IUser[]>(LOAD_USERS_ACTION, users));
                }, (error: Error) => {
                    dispatch(asyncActionFailedPayload<IUser[]>(LOAD_USERS_ACTION, error));
                });
            
            firebaseDatabase.ref("/userGroups/admin").once("value")
                .then((adminUsersSnapshot: firebase.database.DataSnapshot) => {
                    adminUsersSnapshot.forEach((adminUser) => {
                        let adminIndex = adminUsers.findIndex((admin) => admin.escapedEmail === adminUser.key);
                        if (adminIndex < 0) {
                            adminUsers.push({
                                hasAccess: adminUser.val(),
                                email: adminUser.key.replace(/\%2E/g, "."),
                                escapedEmail: adminUser.key,
                            });
                        } else {
                            adminUsers[adminIndex].hasAccess = adminUser.val();
                        }
                        return false;
                    });
                    dispatch(asyncActionSucceededPayload<IUser[]>(LOAD_ADMIN_USERS_ACTION, adminUsers));
                }, (error: Error) => {
                    dispatch(asyncActionFailedPayload<IUser[]>(LOAD_ADMIN_USERS_ACTION, error));
                });
        });
    }
}

export function loadUsersAndAuthInfoAction() {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        if (!isAsyncLoaded(getState().hunt)) {
            loadHuntAndUserInfo(dispatch, getState)
                .then(() => {
                    loadUsers()(dispatch);
                })
                .catch((error: Error) => {
                    let huntLoadError = error;
                    if ((error as any).code === "PERMISSION_DENIED") {
                        huntLoadError = new Error("You aren't authorized to view this page. Please ask a superteamawesome admin to request access");
                        dispatch(asyncActionFailedPayload<IAuthState>(LOGIN_ACTION, huntLoadError));
                    }
                    dispatch(asyncActionFailedPayload<IUser[]>(LOAD_USERS_ACTION, huntLoadError));
                    dispatch(asyncActionFailedPayload<IUser[]>(LOAD_ADMIN_USERS_ACTION, huntLoadError));
                    dispatch(asyncActionFailedPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, huntLoadError));
                });
        } else {
            loadUserInfo(dispatch, getState().auth, getState().lifecycle)
                .then(() => {
                    loadUsers()(dispatch);
                })
                .catch((error: Error) => {
                    let huntLoadError = error;
                    if ((error as any).code === "PERMISSION_DENIED") {
                        huntLoadError = new Error("You aren't authorized to view this page. Please ask a superteamawesome admin to request access");
                        dispatch(asyncActionFailedPayload<IAuthState>(LOGIN_ACTION, huntLoadError));
                    }
                    dispatch(asyncActionFailedPayload<IUser[]>(LOAD_USERS_ACTION, huntLoadError));
                    dispatch(asyncActionFailedPayload<IUser[]>(LOAD_ADMIN_USERS_ACTION, huntLoadError));
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