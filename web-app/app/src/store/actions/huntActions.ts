import { Dispatch } from "redux";

import { firebaseDatabase } from "../../auth";
import { slack } from "../../services/slackService";
import { IAppState, IAuthState, IHuntState } from "../state";
import { loadUserInfo, LOGIN_ACTION } from "./authActions";
import { loadFolder } from "./googleActions";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload,
    asyncActionSucceededPayload,
    isAsyncLoaded,
} from "./loading";

export const LOAD_HUNT_ACTION = "LOAD_HUNT";
export interface IHunt {
    host: string;
    isCurrent: boolean;
    name: string;
    titleRegex?: string;
}

export interface ILoadHuntActionPayload extends IHunt {
    year: string;
    slackTeamId?: string;
}

export async function loadHuntAndUserInfo(dispatch: Dispatch<IAppState>, getState: () => IAppState) {
    dispatch(asyncActionInProgressPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION));
    try {
        const slackAccessToken = await loadUserInfo(dispatch, getState().auth, getState().lifecycle);
        return new Promise((resolve, reject) => {
            firebaseDatabase.ref("currentHunt").once(
                "value",
                snapshot => {
                    const huntRef = snapshot.val();
                    firebaseDatabase.ref(`hunts/${huntRef}`).once(
                        "value",
                        huntSnapshot => {
                            const hunt = huntSnapshot.val() as IHunt;
                            if (slackAccessToken !== undefined) {
                                slack.team.info(slackAccessToken).then(teamInfo => {
                                    dispatch(
                                        asyncActionSucceededPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, {
                                            ...hunt,
                                            year: huntSnapshot.key,
                                            slackTeamId: teamInfo.id,
                                        }),
                                    );
                                });
                            } else {
                                dispatch(
                                    asyncActionSucceededPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, {
                                        ...hunt,
                                        year: huntSnapshot.key,
                                    }),
                                );
                            }
                            resolve();
                        },
                        (error: Error) => {
                            dispatch(asyncActionFailedPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, error));
                            reject(error);
                        },
                    );
                },
                (error: Error) => {
                    dispatch(asyncActionFailedPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, error));
                    reject(error);
                },
            );
        });
    } catch (error) {
        dispatch(asyncActionFailedPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, error));
        dispatch(asyncActionFailedPayload<IAuthState>(LOGIN_ACTION, error));
        return undefined;
    }
}

export const LOAD_ALL_HUNTS_ACTION = "LOAD_ALL_HUNTS";
export interface ILoadAllHuntsPayload {
    [key: string]: IHuntState;
}

export function loadAllHuntsAndUserInfo() {
    return async (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<ILoadAllHuntsPayload>(LOAD_ALL_HUNTS_ACTION));
        try {
            await loadUserInfo(dispatch, getState().auth, getState().lifecycle);
            const hunts = await new Promise<ILoadAllHuntsPayload>((resolve, reject) => {
                firebaseDatabase.ref("hunts").once(
                    "value",
                    allHuntsSnapshot => {
                        resolve(allHuntsSnapshot.val());
                    },
                    (error: Error) => {
                        dispatch(asyncActionFailedPayload<ILoadAllHuntsPayload>(LOAD_ALL_HUNTS_ACTION, error));
                        reject(error);
                    },
                );
            });
            dispatch(asyncActionSucceededPayload<ILoadAllHuntsPayload>(LOAD_ALL_HUNTS_ACTION, hunts));
        } catch (error) {
            dispatch(asyncActionFailedPayload<ILoadAllHuntsPayload>(LOAD_ALL_HUNTS_ACTION, error));
            dispatch(asyncActionFailedPayload<IAuthState>(LOGIN_ACTION, error));
        }
    };
}

// should only be called once
export function loadHuntAndUserInfoAction() {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        loadHuntAndUserInfo(dispatch, getState).catch((error: Error) => {
            let huntLoadError = error;
            if ((error as any).code === "PERMISSION_DENIED") {
                huntLoadError = new Error(
                    "You aren't authorized to view this page. Please ask a superteamawesome admin to request access",
                );
                dispatch(asyncActionFailedPayload<IAuthState>(LOGIN_ACTION, huntLoadError));
            }
            dispatch(asyncActionFailedPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, huntLoadError));
        });
    };
}

export const SAVE_HUNT_ACTION = "SAVE_HUNT_INFO";
export type ISaveHuntActionPayload = IHuntState;

export function saveHuntInfoAction(hunt: IHuntState, huntId: string) {
    return async (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION));
        const firebaseUpdates: { [key: string]: any } = {};
        for (const huntDetail in hunt) {
            if (hunt[huntDetail as keyof IHuntState] != null) {
                firebaseUpdates[`hunts/${huntId}/${huntDetail}`] = hunt[huntDetail as keyof IHuntState];
            }
        }
        const hostNameKey = await new Promise(resolve => {
            firebaseDatabase
                .ref("huntHostNames")
                .orderByChild("hunt")
                .equalTo(huntId)
                .limitToFirst(1)
                .once("value", snapshot => {
                    if (snapshot.numChildren()) {
                        snapshot.forEach(hostName => {
                            resolve(hostName.key);
                            return true;
                        });
                    } else {
                        resolve(undefined);
                    }
                });
        });
        // if the domain changes, need to change this so the extension works
        firebaseUpdates[`huntHostNames/${hostNameKey}/hostName`] = hunt.domain;
        const hunts: { [key: string]: IHuntState } = isAsyncLoaded(getState().hunts)
            ? getState().hunts.value
            : await new Promise(resolve =>
                  firebaseDatabase.ref("hunts").once("value", snapshot => resolve(snapshot.val())),
              );
        if (hunt.isCurrent) {
            for (const existingHuntId in hunts) {
                if (hunts[existingHuntId] != null && existingHuntId !== huntId) {
                    firebaseUpdates[`hunts/${existingHuntId}/isCurrent`] = false;
                }
            }
            firebaseUpdates.currentHunt = huntId;
        }
        const succeeded = await new Promise(resolve => {
            firebaseDatabase.ref().update(firebaseUpdates, (error: Error | null) => {
                if (error == null) {
                    dispatch(asyncActionSucceededPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION, hunt));
                } else {
                    dispatch(asyncActionFailedPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION, error));
                }
                resolve(error == null);
            });
        });

        if (succeeded) {
            reloadAllHunts(dispatch);
        }
    };
}

export const ADD_NEW_HUNT_ACTION = "ADD_NEW_HUNT";
export interface IAddNewHuntActionPayload extends IHuntState {
    huntId: string;
}

export function addNewHuntAction(hunt: IAddNewHuntActionPayload) {
    return async (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IAddNewHuntActionPayload>(ADD_NEW_HUNT_ACTION));
        const currentHunts: { [key: string]: IHuntState } = await new Promise((resolve, reject) => {
            firebaseDatabase.ref("hunts").once(
                "value",
                snapshot => resolve(snapshot.val()),
                (error: Error) => {
                    dispatch(asyncActionFailedPayload<IAddNewHuntActionPayload>(ADD_NEW_HUNT_ACTION, error));
                    reject(error);
                },
            );
        });

        if (currentHunts[hunt.huntId] !== undefined) {
            dispatch(
                asyncActionFailedPayload<IAddNewHuntActionPayload>(
                    ADD_NEW_HUNT_ACTION,
                    new Error("A hunt with that ID already exists."),
                ),
            );
        } else {
            const newHunt: IHuntState = { ...hunt };
            delete (newHunt as any).huntId;
            const firebaseUpdates: { [key: string]: any } = {};
            for (const huntDetail in newHunt) {
                if (newHunt[huntDetail as keyof IHuntState] != null) {
                    firebaseUpdates[`hunts/${hunt.huntId}/${huntDetail}`] = newHunt[huntDetail as keyof IHuntState];
                }
            }
            const key = hunt.year + hunt.domain.replace(/[\.|\/]/gi, "");
            firebaseUpdates[`huntHostNames/${key}/hostName`] = hunt.domain;
            firebaseUpdates[`huntHostNames/${key}/hunt`] = hunt.huntId;

            if (newHunt.isCurrent) {
                for (const huntId in currentHunts) {
                    if (currentHunts[huntId] != null) {
                        firebaseUpdates[`hunts/${huntId}/isCurrent`] = false;
                    }
                }
                firebaseUpdates.currentHunt = hunt.huntId;
            }

            const succeeded = await new Promise(resolve => {
                firebaseDatabase.ref().update(firebaseUpdates, (error: Error | null) => {
                    if (error == null) {
                        dispatch(asyncActionSucceededPayload<IAddNewHuntActionPayload>(ADD_NEW_HUNT_ACTION, hunt));
                    } else {
                        dispatch(asyncActionFailedPayload<IAddNewHuntActionPayload>(ADD_NEW_HUNT_ACTION, error));
                    }
                    resolve(error == null);
                });
            });

            if (succeeded) {
                reloadAllHunts(dispatch);
            }
        }
    };
}

export async function reloadAllHunts(dispatch: Dispatch<IAppState>) {
    const hunts = await new Promise<ILoadAllHuntsPayload>((resolve, reject) => {
        firebaseDatabase.ref("hunts").once(
            "value",
            allHuntsSnapshot => {
                resolve(allHuntsSnapshot.val());
            },
            (error: Error) => {
                dispatch(asyncActionFailedPayload<ILoadAllHuntsPayload>(LOAD_ALL_HUNTS_ACTION, error));
                reject(error);
            },
        );
    });
    dispatch(asyncActionSucceededPayload<ILoadAllHuntsPayload>(LOAD_ALL_HUNTS_ACTION, hunts));
}

export const SET_HUNT_DRIVE_FOLDER_ACTION = "SET_HUNT_DRIVE_FOLDER";

export function setHuntDriveFolderAction(folderId: string, huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<string>(SET_HUNT_DRIVE_FOLDER_ACTION));
        firebaseDatabase
            .ref(`hunts/${huntKey}/driveFolderId`)
            .set(folderId)
            .then(
                () => {
                    return loadFolder(dispatch, folderId);
                },
                (error: Error) => {
                    dispatch(asyncActionFailedPayload<string>(SET_HUNT_DRIVE_FOLDER_ACTION, error));
                },
            )
            .then(() => {
                dispatch(asyncActionSucceededPayload<string>(SET_HUNT_DRIVE_FOLDER_ACTION, folderId));
            });
    };
}
