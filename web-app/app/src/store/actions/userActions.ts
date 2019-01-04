import { Dispatch } from "redux";

import { firebaseDatabase } from "../../auth";
import { getDrivePermissions } from "../../services/googleService";
import { IAppState, IAuthState, IUser } from "../state";
import { loadUserInfo, LOGIN_ACTION } from "./authActions";
import { ILoadHuntActionPayload, LOAD_HUNT_ACTION, loadHuntAndUserInfo } from "./huntActions";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload,
    asyncActionSucceededPayload,
    isAsyncLoaded,
} from "./loading";

export const TOGGLE_USER_APPROVAL_ACTION = "TOGGLE_USER_APPROVAL";
export function toggleUserApprovalAction(user: IUser, grantAccess: boolean) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IUser>(TOGGLE_USER_APPROVAL_ACTION));
        const access = grantAccess ? true : null;
        firebaseDatabase
            .ref(`/userGroups/approved/${user.escapedEmail}`)
            .set(access)
            .then(
                () => {
                    const toggledUser = { ...user, hasAccess: !user.hasAccess };
                    dispatch(asyncActionSucceededPayload<IUser>(TOGGLE_USER_APPROVAL_ACTION, toggledUser));
                },
                (error: Error) => {
                    dispatch(asyncActionFailedPayload<IUser>(TOGGLE_USER_APPROVAL_ACTION, error));
                },
            );
    };
}

export const TOGGLE_ADMIN_ACCESS_ACTION = "TOGGLE_ADMIN";
export function toggleAdminAccessAction(user: IUser, makeAdmin: boolean) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IUser>(TOGGLE_ADMIN_ACCESS_ACTION));
        const access = makeAdmin ? true : null;
        firebaseDatabase
            .ref(`/userGroups/admin/${user.escapedEmail}`)
            .set(access)
            .then(
                () => {
                    const toggledUser = { ...user, hasAccess: makeAdmin };
                    dispatch(asyncActionSucceededPayload<IUser>(TOGGLE_ADMIN_ACCESS_ACTION, toggledUser));
                },
                (error: Error) => {
                    dispatch(asyncActionFailedPayload<IUser>(TOGGLE_ADMIN_ACCESS_ACTION, error));
                },
            );
    };
}

export const LOAD_USERS_ACTION = "LOAD_USERS";
export const LOAD_ADMIN_USERS_ACTION = "LOAD_ADMIN_USERS";

export function loadUsers() {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IUser[]>(LOAD_USERS_ACTION));
        dispatch(asyncActionInProgressPayload<IUser[]>(LOAD_ADMIN_USERS_ACTION));
        firebaseDatabase.ref("/users").on("value", usersSnapshot => {
            const allUsers: IUser[] = [];
            usersSnapshot.forEach(userSnapshot => {
                const user = userSnapshot.val() as IUser;
                const escapedEmail = user.email.toLowerCase().replace(/\./g, "%2E");
                allUsers.push({ ...user, escapedEmail });
                return false;
            });
            let users: IUser[] = [];
            const adminUsers: IUser[] = [];

            firebaseDatabase
                .ref("/userGroups/admin")
                .once("value")
                .then(
                    (adminUsersSnapshot: firebase.database.DataSnapshot) => {
                        adminUsersSnapshot.forEach(adminUserSnapshot => {
                            const adminIndex = allUsers.findIndex(
                                admin => admin.escapedEmail === adminUserSnapshot.key,
                            );
                            let adminUser: IUser;
                            if (adminIndex < 0) {
                                adminUser = {
                                    email: adminUserSnapshot.key.replace(/\%2E/g, "."),
                                    escapedEmail: adminUserSnapshot.key,
                                };
                            } else {
                                adminUser = allUsers[adminIndex];
                            }
                            adminUser.hasAccess = adminUserSnapshot.val();
                            adminUsers.push(adminUser);
                            return false;
                        });
                        dispatch(asyncActionSucceededPayload<IUser[]>(LOAD_ADMIN_USERS_ACTION, adminUsers));

                        firebaseDatabase
                            .ref("/userGroups/approved")
                            .once("value")
                            .then(
                                (approvedUsersSnapshot: firebase.database.DataSnapshot) => {
                                    users = allUsers.filter(firebaseUser => {
                                        return (
                                            adminUsers.findIndex(adminUser => adminUser.email === firebaseUser.email) <
                                            0
                                        );
                                    });
                                    approvedUsersSnapshot.forEach(approvedUser => {
                                        const userIndex = users.findIndex(
                                            user => user.escapedEmail === approvedUser.key,
                                        );
                                        if (
                                            adminUsers.findIndex(
                                                adminUser => adminUser.escapedEmail === approvedUser.key,
                                            ) < 0
                                        ) {
                                            if (userIndex < 0) {
                                                users.push({
                                                    hasAccess: approvedUser.val(),
                                                    email: approvedUser.key.replace(/\%2E/g, "."),
                                                    escapedEmail: approvedUser.key,
                                                });
                                            } else {
                                                users[userIndex].hasAccess = approvedUser.val();
                                            }
                                        }
                                        return false;
                                    });
                                    dispatch(asyncActionSucceededPayload<IUser[]>(LOAD_USERS_ACTION, users));
                                },
                                (error: Error) => {
                                    dispatch(asyncActionFailedPayload<IUser[]>(LOAD_USERS_ACTION, error));
                                },
                            );
                    },
                    (error: Error) => {
                        dispatch(asyncActionFailedPayload<IUser[]>(LOAD_ADMIN_USERS_ACTION, error));
                    },
                );
        });
    };
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
                        huntLoadError = new Error(
                            "You aren't authorized to view this page. Please ask a superteamawesome admin to request access",
                        );
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
                        huntLoadError = new Error(
                            "You aren't authorized to view this page. Please ask a superteamawesome admin to request access",
                        );
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
            .then(permissions => {
                const promises: Array<Promise<void>> = [];
                permissions.forEach(permission => {
                    // if the user has write permissions to the drive add them if they're not there already
                    if (
                        (permission.type === "user" || permission.type === "admin") &&
                        (permission.role === "owner" || permission.role === "writer")
                    ) {
                        const escapedEmail = permission.emailAddress.toLowerCase().replace(/\./g, "%2E");
                        promises.push(
                            new Promise<void>((resolve, reject) => {
                                firebaseDatabase.ref(`/userGroups/approved/${escapedEmail}`).once(
                                    "value",
                                    snapshot => {
                                        if (snapshot.val() == null) {
                                            firebaseDatabase
                                                .ref(`/userGroups/approved/${escapedEmail}`)
                                                .set(true)
                                                .then(
                                                    () => {
                                                        resolve();
                                                    },
                                                    error => {
                                                        reject(error);
                                                    },
                                                );
                                        } else {
                                            resolve();
                                        }
                                    },
                                    (error: Error) => {
                                        reject(error);
                                    },
                                );
                            }),
                        );
                    }
                });
                return Promise.all(promises);
            })
            .then(() => {
                // users have been added, hooray
                dispatch(asyncActionSucceededPayload<void>(BOOTSTRAP_USERS_ACTION));
            })
            .catch(error => {
                dispatch(asyncActionFailedPayload<void>(BOOTSTRAP_USERS_ACTION, error));
            });
    };
}
