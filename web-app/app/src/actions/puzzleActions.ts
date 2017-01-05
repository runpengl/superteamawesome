import { Dispatch } from "redux";
import * as firebase from "firebase";
import { IGoogleDriveFile } from "gapi";

import { firebaseDatabase } from "../auth";
import { createSheet, slack } from "../services";
import { IAppState, IDiscoveredPage, PuzzleStatus } from "../state";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload,
    asyncActionSucceededPayload,
} from "./loading";

export const LOAD_DISCOVERED_PUZZLES_ACTION = "LOAD_DISCOVERED_PUZZLES";
export function loadDiscoveredPagesAction(huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IDiscoveredPage[]>(LOAD_DISCOVERED_PUZZLES_ACTION));
        firebaseDatabase
            .ref(`discoveredPages/${huntKey}`)
            .once("value", (snapshot: firebase.database.DataSnapshot) => {
                let discoveredPages: IDiscoveredPage[] = [];
                snapshot.forEach((discoveredPuzzleSnapshot: firebase.database.DataSnapshot) => {
                    if (!discoveredPuzzleSnapshot.val().ignored) {
                        discoveredPages.push(Object.assign({}, discoveredPuzzleSnapshot.val(), { key: discoveredPuzzleSnapshot.key }));
                    }
                    return false;
                });
                dispatch(asyncActionSucceededPayload<IDiscoveredPage[]>(LOAD_DISCOVERED_PUZZLES_ACTION, discoveredPages));
            }, (error: Error) => {
                asyncActionFailedPayload<IDiscoveredPage[]>(LOAD_DISCOVERED_PUZZLES_ACTION, error);
            });
    };
}

export const LOAD_IGNORED_PAGES_ACTION = "LOAD_IGNORED_PAGES";
export function loadIgnoredPagesAction(huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IDiscoveredPage[]>(LOAD_IGNORED_PAGES_ACTION));
        firebaseDatabase
            .ref(`discoveredPages/${huntKey}`)
            .once("value", (snapshot: firebase.database.DataSnapshot) => {
                let ignoredPages: IDiscoveredPage[] = [];
                snapshot.forEach((discoveredPuzzleSnapshot: firebase.database.DataSnapshot) => {
                    if (discoveredPuzzleSnapshot.val().ignored) {
                        ignoredPages.push(Object.assign({}, discoveredPuzzleSnapshot.val(), { key: discoveredPuzzleSnapshot.key }));
                    }
                    return false;
                });
                dispatch(asyncActionSucceededPayload<IDiscoveredPage[]>(LOAD_IGNORED_PAGES_ACTION, ignoredPages));
            }, (error: Error) => {
                asyncActionFailedPayload<IDiscoveredPage[]>(LOAD_IGNORED_PAGES_ACTION, error);
            });
    }
}

export const IGNORE_DISCOVERED_PAGE_ACTION = "IGNORE_PAGE";
export function ignoreDiscoveredPageAction(discoveredPage: IDiscoveredPage) {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        const hunt = getState().hunt.value;
        dispatch(asyncActionInProgressPayload<IDiscoveredPage[]>(IGNORE_DISCOVERED_PAGE_ACTION));
        firebaseDatabase
            .ref(`discoveredPages/${hunt.year}/${discoveredPage.key}/ignored`)
            .set(true)
            .then(() => {
                dispatch(asyncActionSucceededPayload<IDiscoveredPage[]>(IGNORE_DISCOVERED_PAGE_ACTION,
                    [Object.assign({}, discoveredPage, { ignored: true })],
                ));
            }, (error: Error) => {
                dispatch(asyncActionFailedPayload<IDiscoveredPage[]>(IGNORE_DISCOVERED_PAGE_ACTION, error));
            });
    }
}

export const CREATE_PUZZLE_ACTION = "CREATE_PUZZLE";
export function createPuzzleAction(puzzleName: string, discoveredPage: IDiscoveredPage) {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        const { auth, hunt: asyncHunt } = getState();
        const hunt = asyncHunt.value;
        const lowerCasePuzzleName = puzzleName.replace(/\ /g, "").toLowerCase();
        const puzzleKey = lowerCasePuzzleName + "-" + hunt.year;
        const slackChannelName = lowerCasePuzzleName.substring(0, 16) + "-" + hunt.year;

        dispatch(asyncActionInProgressPayload<IDiscoveredPage[]>(CREATE_PUZZLE_ACTION));
        // remove from db first
        const removeFirebasePromise = new Promise((resolve) => {
            firebaseDatabase
                .ref(`discoveredPages/${hunt.year}/${discoveredPage.key}`)
                .set(null)
                .then(() => {
                    resolve();
                }, (error: Error) => {
                    throw error;
                });
        });

        const checkPuzzleExists = new Promise((resolve, reject) => {
            firebaseDatabase
                .ref(`puzzles/${puzzleKey}`)
                .once("value", (snapshot) => {
                    if (snapshot.val() != null) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }, (error: Error) => {
                    reject(error);
                });
        });

        let spreadsheet: IGoogleDriveFile;
        checkPuzzleExists
            .then((exists: boolean) => {
                if (exists) {
                    throw new Error("Puzzle exists already. Consider changing the name");
                } else {
                    return createSheet(hunt.templateSheetId, hunt.driveFolderId, puzzleName);
                }
            })
            .then((resultSpreadsheet) => {
                spreadsheet = resultSpreadsheet;
                return slack.channels.create(auth.slackToken, slackChannelName);
            })
            .then((channel) => {
                firebaseDatabase
                    .ref(`puzzles/${puzzleKey}`)
                    .set({
                        createdAt: spreadsheet.createdDate,
                        hunt: hunt.year,
                        name: puzzleName,
                        path: discoveredPage.path,
                        slackChannel: channel.name,
                        slackChannelId: channel.id,
                        spreadsheetId: spreadsheet.id,
                        status: PuzzleStatus.NEW,
                    })
                    .then(() => {
                        removeFirebasePromise.then(() => {
                            dispatch(asyncActionSucceededPayload<IDiscoveredPage[]>(CREATE_PUZZLE_ACTION, [discoveredPage]));
                        });
                    }, (error) => {
                        dispatch(asyncActionFailedPayload<IDiscoveredPage>(CREATE_PUZZLE_ACTION, error));
                    })
            })
            .catch((error) => {
                dispatch(asyncActionFailedPayload<IDiscoveredPage>(CREATE_PUZZLE_ACTION, error));
            })
    }
}
