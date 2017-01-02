import { Dispatch } from "redux";

import { firebaseAuth, firebaseDatabase } from "../auth";
import { IAppState, IHuntState } from "../state";
import { LOGIN_ACTION, ILoginActionPayload } from "./authActions";
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
    year: number;
}

export function loadHuntAndUserInfoAction() {
    return (dispatch: Dispatch<IAppState>, _getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION));
        dispatch(asyncActionInProgressPayload<ILoginActionPayload>(LOGIN_ACTION));
        firebaseAuth().onAuthStateChanged((user: firebase.UserInfo) => {
            dispatch(asyncActionSucceededPayload<ILoginActionPayload>(
                LOGIN_ACTION,
                {
                    googleToken: (user as any).refreshToken,
                    user,
                }
            ));
            firebaseDatabase
                .ref("hunts")
                .orderByChild("isCurrent")
                .equalTo(true)
                .limitToFirst(1)
                .on("value", (huntSnapshots) => {
                    huntSnapshots.forEach((huntSnapshot) => {
                        const hunt = huntSnapshot.val() as IHunt;
                        dispatch(asyncActionSucceededPayload<ILoadHuntActionPayload>(
                            LOAD_HUNT_ACTION,
                            Object.assign({}, hunt, { year: Number(huntSnapshot.key) }),
                        ));
                        return true;
                    });
                }, (error: Error) => {
                    dispatch(asyncActionFailedPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, error));
                });
        });
    }
}

export const SAVE_HUNT_ACTION = "SAVE_HUNT_INFO";
export interface ISaveHuntActionPayload extends IHunt { }

export function saveHuntInfoAction(hunt: IHuntState) {
    return (dispatch: Dispatch<IAppState>, _getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION));
        let huntInfo = Object.assign({}, hunt);
        delete huntInfo["year"];
        firebaseDatabase
            .ref(`hunts/${hunt.year}`)
            .set(huntInfo)
            .then((a) => {
                console.log(a);
                dispatch(asyncActionSucceededPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION, huntInfo));
            }, (error: Error) => {
                dispatch(asyncActionFailedPayload<ISaveHuntActionPayload>(SAVE_HUNT_ACTION, error));
            })
    };
}
