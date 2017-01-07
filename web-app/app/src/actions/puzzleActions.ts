import { Dispatch } from "redux";
import * as firebase from "firebase";
import { IGoogleDriveFile } from "gapi";

import { firebaseDatabase } from "../auth";
import { createSheet, slack } from "../services";
import { IAppState, IDiscoveredPage, IPuzzle, IPuzzleHierarchy, PuzzleStatus } from "../state";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload,
    asyncActionSucceededPayload,
} from "./loading";

export const LOAD_PUZZLES_ACTION = "LOAD_PUZZLES";
export function loadPuzzlesAction(huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IPuzzle[]>(LOAD_PUZZLES_ACTION));
        firebaseDatabase
            .ref("puzzles")
            .orderByChild("hunt")
            .equalTo(huntKey)
            .once("value", (snapshot) => {
                let puzzles: IPuzzle[] = [];
                snapshot.forEach((puzzleSnapshot) => {
                    puzzles.push(Object.assign({}, puzzleSnapshot.val(), { key: puzzleSnapshot.key }));
                    return false;
                });

                puzzles.sort((a: IPuzzle, b: IPuzzle) => {
                    const aDate = new Date(a.createdAt);
                    const bDate = new Date(b.createdAt);
                    return aDate.valueOf() - bDate.valueOf();
                });

                puzzles = puzzles.map((puzzle, index) => Object.assign({}, puzzle, { index }));
                dispatch(asyncActionSucceededPayload<IPuzzle[]>(LOAD_PUZZLES_ACTION, puzzles));
            }, (error: Error) => {
                dispatch(asyncActionFailedPayload<IPuzzle[]>(LOAD_PUZZLES_ACTION, error));
            });
    }
}

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

export const SAVE_DISCOVERED_PAGE_CHANGES_ACTION = "SAVE_DISCOVERED_PAGE_CHANGES";
export interface IDiscoveredPageChanges {
    title?: string;
    link?: string;
}
export function saveDiscoveredPageChangesAction(changes: { [key: string]: IDiscoveredPageChanges }) {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<IDiscoveredPage[]>(SAVE_DISCOVERED_PAGE_CHANGES_ACTION));
        const huntKey = getState().hunt.value.year;
        let changePromises: Promise<IDiscoveredPage>[] = [];
        Object.keys(changes).forEach((key) => {
            const updates: { [key: string]: string } = {};
            if (changes[key].title !== undefined) {
                updates[`/discoveredPages/${huntKey}/${key}/title`] = changes[key].title;
            }
            if (changes[key].link !== undefined) {
                updates[`/discoveredPages/${huntKey}/${key}/link`] = changes[key].link;
            }
            if (Object.keys(updates).length > 0) {
                const changePromise = new Promise<IDiscoveredPage>((resolve) => {
                    firebaseDatabase.ref().update(updates).then(() => {
                        firebaseDatabase.ref(`discoveredPages/${huntKey}/${key}`)
                            .once("value", (snapshot: firebase.database.DataSnapshot) => {
                                resolve(Object.assign({}, snapshot.val(), { key: snapshot.key }));
                            })
                    }, (error) => {
                        throw error;
                    })
                });
                changePromises.push(changePromise);
            }
        });

        Promise.all(changePromises)
            .then((changedPages: IDiscoveredPage[]) => {
                dispatch(asyncActionSucceededPayload<IDiscoveredPage[]>(SAVE_DISCOVERED_PAGE_CHANGES_ACTION, changedPages));
            })
            .catch((error: Error) => {
                dispatch(asyncActionFailedPayload<IDiscoveredPage[]>(SAVE_DISCOVERED_PAGE_CHANGES_ACTION, error));
            })
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
export interface ICreatePuzzleActionPayload {
    changedPages: IDiscoveredPage[];
    newPuzzles: IPuzzle[];
}
export function createPuzzleAction(puzzleName: string, discoveredPage: IDiscoveredPage) {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        const { auth, hunt: asyncHunt } = getState();
        const hunt = asyncHunt.value;
        const lowerCasePuzzleName = puzzleName.replace(/\ /g, "").toLowerCase();
        const puzzleKey = lowerCasePuzzleName + "-" + hunt.year;
        const slackChannelName = "x-" + lowerCasePuzzleName.substring(0, 19);

        dispatch(asyncActionInProgressPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION));

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
                const newPuzzle: IPuzzle = {
                    createdAt: spreadsheet.createdDate,
                    hunt: hunt.year,
                    key: puzzleKey,
                    name: puzzleName,
                    path: discoveredPage.path,
                    slackChannel: channel.name,
                    slackChannelId: channel.id,
                    spreadsheetId: spreadsheet.id,
                    status: PuzzleStatus.NEW,
                };
                firebaseDatabase
                    .ref(`puzzles/${puzzleKey}`)
                    .set(newPuzzle)
                    .then(() => {
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
                        removeFirebasePromise.then(() => {
                            dispatch(asyncActionSucceededPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, {
                                changedPages: [discoveredPage],
                                newPuzzles: [newPuzzle],
                            }));
                        });
                    }, (error) => {
                        dispatch(asyncActionFailedPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, error));
                    })
            })
            .catch((error) => {
                dispatch(asyncActionFailedPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, error));
            })
    }
}

export const SAVE_HIERARCHY_ACTION = "SAVE_HIERARCHY";
export function saveHierarchyAction(hierarchy: IPuzzleHierarchy) {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        let promises: Promise<void>[] = [];
        dispatch(asyncActionInProgressPayload<void>(SAVE_HIERARCHY_ACTION));
        Object.keys(hierarchy).forEach((groupKey) => {
            let childPromises = hierarchy[groupKey].children.map((puzzle) => {
                const updates = {
                    [`/puzzles/${puzzle.key}/parent`]: hierarchy[groupKey].parent.key,
                    [`/puzzles/${puzzle.key}/parentIndex`]: hierarchy[groupKey].index,
                };
                return new Promise<void>((resolve) => {
                    firebaseDatabase.ref().update(updates).then(() => {
                        resolve();
                    }, (error) => {
                        throw error;
                    });
                });
            });
            promises = promises.concat(childPromises);
        });
        Promise.all(promises).then(() => {
            dispatch(asyncActionSucceededPayload<void>(SAVE_HIERARCHY_ACTION));
            loadPuzzlesAction(getState().hunt.value.year)(dispatch);
        }).catch((error) => {
            dispatch(asyncActionFailedPayload<void>(SAVE_HIERARCHY_ACTION, error));
        });
    };
}