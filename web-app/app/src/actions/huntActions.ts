import { Dispatch } from "redux";

import { firebaseDatabase } from "../auth";
import { IAppState } from "../state";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload, 
    asyncActionSucceededPayload,
} from "./loading";

export const LOAD_HUNT_ACTION = "LOAD_HUNT_ACTION";
export interface ILoadHuntActionPayload {
    domain: string;
    name: string;
    year: number;
}

export interface IHunt {
    domain: string;
    isCurrent: boolean;
    name: string;
}

export function loadHuntAction() {
    return (dispatch: Dispatch<IAppState>, _getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION));
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
                        {
                            domain: hunt.domain,
                            name: hunt.name,
                            year: Number(huntSnapshot.key),
                        },
                    ));
                    return true;
                });
            }, (error: Error) => {
                dispatch(asyncActionFailedPayload<ILoadHuntActionPayload>(LOAD_HUNT_ACTION, error));
            });
    }
}
