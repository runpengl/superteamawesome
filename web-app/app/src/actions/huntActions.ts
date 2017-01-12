import { Dispatch } from "redux";

import { firebaseDatabase } from "../auth";
import { slack } from "../services";
import { IAppState, IAuthState, IHuntState } from "../state";
import { loadUserInfo, LOGIN_ACTION } from "./authActions";
import { loadFolder } from "./googleActions";

import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload, 
    asyncActionSucceededPayload,
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
}

export function loadHuntAndUserInfo(dispatch: Dispatch<IAppState>, getState: () => IAppState) {
    dispatch(asyncActionInProgressPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION));
    return loadUserInfo(dispatch, getState().auth, getState().lifecycle).then((slackAccessToken: string) => {
        return new Promise((resolve, reject) => {
            firebaseDatabase
                .ref("hunts")
                .orderByChild("isCurrent")
                .equalTo(true)
                .limitToFirst(1)
                .on("value", (huntSnapshots) => {
                    huntSnapshots.forEach((huntSnapshot) => {
                        const hunt = huntSnapshot.val() as IHunt;
                        if (slackAccessToken !== undefined) {
                            slack.team.info(slackAccessToken).then((teamInfo) => {
                                dispatch(asyncActionSucceededPayload<ILoadHuntActionPayload>(
                                    LOAD_HUNT_ACTION,
                                    Object.assign({}, hunt, { year: huntSnapshot.key, slackTeamId: teamInfo.id }),
                                ));
                            });
                        } else {
                            dispatch(asyncActionSucceededPayload<ILoadHuntActionPayload>(
                                LOAD_HUNT_ACTION,
                                Object.assign({}, hunt, { year: huntSnapshot.key }),
                            ));
                        }
                        return true;
                    });
                    resolve();
                }, (error: Error) => {
                    dispatch(asyncActionFailedPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, error));
                    reject(error);
                });
        })
    });
}

// should only be called once
export function loadHuntAndUserInfoAction() {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        loadHuntAndUserInfo(dispatch, getState).catch((error: Error) => {
            let huntLoadError = error;
            if ((error as any).code === "PERMISSION_DENIED") {
                huntLoadError = new Error("You aren't authorized to view this page. Please ask a superteamawesome admin to request access");
                dispatch(asyncActionFailedPayload<IAuthState>(LOGIN_ACTION, huntLoadError));
            }
            dispatch(asyncActionFailedPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, huntLoadError));
        });
    }
}

export const SAVE_HUNT_ACTION = "SAVE_HUNT_INFO";
export interface ISaveHuntActionPayload extends IHuntState { }

export function saveHuntInfoAction(hunt: IHuntState) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION));
        let huntInfo = Object.assign({}, hunt) as ISaveHuntActionPayload;
        delete huntInfo["year"];
        firebaseDatabase
            .ref(`hunts/${hunt.year}`)
            .set(huntInfo)
            .then(() => {
                dispatch(asyncActionSucceededPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION, huntInfo));
            }, (error: Error) => {
                dispatch(asyncActionFailedPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION, error));
            })
    };
}

export const SET_HUNT_DRIVE_FOLDER_ACTION = "SET_HUNT_DRIVE_FOLDER";

export function setHuntDriveFolderAction(folderId: string, huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<string>(SET_HUNT_DRIVE_FOLDER_ACTION));
        firebaseDatabase
            .ref(`hunts/${huntKey}/driveFolderId`)
            .set(folderId)
            .then(() => {
                return loadFolder(dispatch, folderId);
            }, (error: Error) => {
                dispatch(asyncActionFailedPayload<string>(SET_HUNT_DRIVE_FOLDER_ACTION, error));
            })
            .then(() => {
                dispatch(asyncActionSucceededPayload<string>(SET_HUNT_DRIVE_FOLDER_ACTION, folderId));
            });
    }
}
