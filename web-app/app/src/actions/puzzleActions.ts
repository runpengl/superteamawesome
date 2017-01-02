import { Dispatch } from "redux";
import * as firebase from "firebase";

import { firebaseDatabase } from "../auth";
import { IAppState, IDiscoveredPuzzle } from "../state";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload, 
    asyncActionSucceededPayload,
} from "./loading";

export const LOAD_DISCOVERED_PUZZLES_ACTION = "LOAD_DISCOVERED_PUZZLES";

export function loadDiscoveredPuzzlesAction(huntKey: number) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IDiscoveredPuzzle[]>(LOAD_DISCOVERED_PUZZLES_ACTION));
        firebaseDatabase
            .ref(`discoveredPages/${huntKey}`)
            .once("value", (snapshot: firebase.database.DataSnapshot) => {
                let discoveredPuzzles: IDiscoveredPuzzle[] = [];
                snapshot.forEach((discoveredPuzzleSnapshot: firebase.database.DataSnapshot) => {
                    discoveredPuzzles.push(discoveredPuzzleSnapshot.val());
                    return true;
                });
                dispatch(asyncActionSucceededPayload<IDiscoveredPuzzle[]>(LOAD_DISCOVERED_PUZZLES_ACTION, discoveredPuzzles));
            }, (error: Error) => {
                asyncActionFailedPayload<IDiscoveredPuzzle[]>(LOAD_DISCOVERED_PUZZLES_ACTION, error);
            });
    };
}