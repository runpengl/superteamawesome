/// <reference path="../../typings/custom/gapi.d.ts" />

import { Dispatch } from "redux";
import * as firebase from "firebase";
import { IGoogleDriveFile, IGoogleShortUrl } from "gapi";

import { firebaseDatabase } from '../auth';
import {
    createSheet,
    deleteSheet,
    getShortUrl,
    ISlackChannel,
    setSheetLinks,
    setSheetPuzzleLink,
    slack,
} from "../services";
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
            .on("value", (snapshot) => {
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
            .on("value", (snapshot: firebase.database.DataSnapshot) => {
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
export interface IPuzzleInfoChanges {
    title?: string;
    link?: string;
}
export function saveDiscoveredPageChangesAction(changes: { [key: string]: IPuzzleInfoChanges }) {
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

export const DELETE_PUZZLE_ACTION = "DELETE_PUZZLE";
export function deletePuzzleAction(puzzle: IPuzzle) {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<void>(DELETE_PUZZLE_ACTION, puzzle.key));
        deleteSheet(puzzle.spreadsheetId)
            .then(() => {
                return slack.channels.archive(getState().auth.slackToken, puzzle.slackChannelId);
            })
            .then(() => {
                return new Promise<void>((resolve) => {
                    firebaseDatabase.ref(`puzzles/${puzzle.key}`).set(null).then(() => {
                        resolve();
                    }, (error) => {
                        throw error;
                    });
                });
            })
            .then(() => {
                dispatch(asyncActionSucceededPayload<void>(DELETE_PUZZLE_ACTION, undefined, puzzle.key));
            })
            .catch((error) => {
                dispatch(asyncActionFailedPayload<void>(DELETE_PUZZLE_ACTION, error, puzzle.key));
            });
    };
}

export const TOGGLE_META_ACTION = "TOGGLE_META_PUZZLE";
export function toggleMetaAction(puzzle: IPuzzle, isMeta: boolean) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<void>(TOGGLE_META_ACTION, { key: puzzle.key, isMeta }));
        firebaseDatabase.ref(`puzzles/${puzzle.key}`).set({
            ...puzzle,
            isMeta,
        }).then(() => {
            dispatch(asyncActionSucceededPayload<void>(TOGGLE_META_ACTION, undefined, { key: puzzle.key, isMeta }));
        }, (error) => {
            dispatch(asyncActionFailedPayload<void>(TOGGLE_META_ACTION, error, { key: puzzle.key, isMeta }));
        })
    };
}

export const CREATE_PUZZLE_ACTION = "CREATE_PUZZLE";
export const CREATE_MANUAL_PUZZLE_ACTION = "CREATE_MANUAL_PUZZLE";
export interface ICreatePuzzleActionPayload {
    changedPages: IDiscoveredPage[];
    newPuzzles: IPuzzle[];
}
export function createManualPuzzleAction(puzzleName: string, puzzleLink: string) {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<void>(CREATE_MANUAL_PUZZLE_ACTION));
        const { auth, hunt: asyncHunt } = getState();
        const hunt = asyncHunt.value;

        const tempElement = document.createElement("a") as HTMLAnchorElement;
        tempElement.href = puzzleLink;
        const host = tempElement.hostname;
        const path = tempElement.pathname;

        const lowerCasePuzzleName = puzzleName.replace(/\ /g, "").toLowerCase();
        const puzzleKey = lowerCasePuzzleName + "-" + hunt.year;
        const slackChannelName = "x-" + lowerCasePuzzleName.substring(0, 19);

        const checkPuzzleExists = new Promise((resolve) => {
            firebaseDatabase
                .ref(`puzzles/${puzzleKey}`)
                .once("value", (snapshot) => {
                    if (snapshot.val() == null) {
                        resolve(true);
                    } else {
                        throw new Error("Puzzle with that name already exists!");
                    }
                }, (error: Error) => {
                    throw error;
                });
        });

        let spreadsheet: IGoogleDriveFile;
        let slackChannel: ISlackChannel;
        let ignoreLink: boolean;
        let shortPuzzleUrl: string;
        checkPuzzleExists
            .then(() => {
                // save the domain if it doesn't exist
                return new Promise<void>((resolve) => {
                    firebaseDatabase.ref("huntHostNames").orderByChild("hostName").equalTo(host).once("value", (snapshot) => {
                        if (snapshot.numChildren() === 0) {
                            const key = hunt.year + host.substring(0, host.indexOf("."));
                            firebaseDatabase.ref(`huntHostNames/${key}`).set({
                                hostName: host,
                                hunt: hunt.year,
                            }).then(() => {
                                resolve();
                            }, (error) => {
                                throw error;
                            });
                        } else {
                            resolve();
                        }
                    });
                });
            })
            .then(() => {
                return new Promise<boolean>((resolve) => {
                    firebaseDatabase.ref("puzzles")
                        .orderByChild("path")
                        .equalTo(path)
                        .once("value", (snapshot) => {
                            snapshot.forEach((puzzleSnapshot) => {
                                if ((puzzleSnapshot.val() as IPuzzle).host === host) {
                                    resolve(true);
                                    return true;
                                }
                                return false;
                            });
                            resolve(false);
                        });
                })
            })
            .then((shouldIgnoreLink: boolean) => {
                ignoreLink = shouldIgnoreLink;
                return createSheet(hunt.templateSheetId, hunt.driveFolderId, puzzleName);
            })
            .then((resultSpreadsheet: IGoogleDriveFile) => {
                spreadsheet = resultSpreadsheet;
                return slack.channels.create(auth.slackToken, slackChannelName);
            })
            .then((channel: ISlackChannel) => {
                slackChannel = channel;
                return setSheetLinks(spreadsheet.id,
                    puzzleLink,
                    `https://superteamawesome.slack.com/messages/${channel.name}`);
            })
            .then(() => {
                return getShortUrl(puzzleLink);
            })
            .then((shortUrl: IGoogleShortUrl) => {
                shortPuzzleUrl = shortUrl.id;
                return getShortUrl(`https://docs.google.com/spreadsheets/d/${spreadsheet.id}/edit`);
            })
            .then((shortUrl: IGoogleShortUrl) => {
                const topic = `Puzzle: ${shortPuzzleUrl} | GSheet: ${shortUrl.id}`;
                return slack.channels.setTopic(auth.slackToken, slackChannel.id, topic);
            })
            .then(() => {
                return slack.channels.leave(auth.slackToken, slackChannel.id);
            })
            .then(() => {
                const newPuzzle: IPuzzle = {
                    createdAt: spreadsheet.createdDate,
                    host,
                    hunt: hunt.year,
                    ignoreLink,
                    name: puzzleName,
                    path,
                    slackChannel: slackChannel.name,
                    slackChannelId: slackChannel.id,
                    spreadsheetId: spreadsheet.id,
                    status: PuzzleStatus.NEW,
                };
                firebaseDatabase
                    .ref(`puzzles/${puzzleKey}`)
                    .set(newPuzzle)
                    .then(() => {
                        newPuzzle.key = puzzleKey;
                        firebaseDatabase.ref("eventLogs").push({
                            name: "PuzzleCreated",
                            puzzleId: puzzleKey,
                            timestampMs: Date.now(),
                            userId: auth.user.uid,
                        });
                        dispatch(asyncActionSucceededPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, {
                            changedPages: [],
                            newPuzzles: [newPuzzle],
                        }));
                        dispatch(asyncActionSucceededPayload<void>(CREATE_MANUAL_PUZZLE_ACTION));
                    }, (error) => {
                        dispatch(asyncActionFailedPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, error));
                    })
            })
            .catch((error) => {
                dispatch(asyncActionFailedPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, error));
                dispatch(asyncActionFailedPayload<void>(CREATE_MANUAL_PUZZLE_ACTION, error));
            });
    }
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
        let slackChannel: ISlackChannel;
        let puzzleLink = `http://${discoveredPage.host}${discoveredPage.path}`;
        let shortPuzzleUrl: string;
        checkPuzzleExists
            .then((exists: boolean) => {
                if (exists) {
                    throw new Error("Puzzle exists already. Consider changing the name");
                } else {
                    return createSheet(hunt.templateSheetId, hunt.driveFolderId, puzzleName);
                }
            })
            .then((resultSpreadsheet: IGoogleDriveFile) => {
                spreadsheet = resultSpreadsheet;
                return slack.channels.create(auth.slackToken, slackChannelName);
            })
            .then((channel: ISlackChannel) => {
                slackChannel = channel;
                return setSheetLinks(spreadsheet.id,
                    puzzleLink,
                    `https://superteamawesome.slack.com/messages/${channel.name}`);
            })
            .then(() => {
                return getShortUrl(puzzleLink);
            })
            .then((shortUrl: IGoogleShortUrl) => {
                shortPuzzleUrl = shortUrl.id;
                return getShortUrl(`https://docs.google.com/spreadsheets/d/${spreadsheet.id}/edit`);
            })
            .then((shortUrl: IGoogleShortUrl) => {
                const topic = `Puzzle: ${shortPuzzleUrl} | GSheet: ${shortUrl.id}`;
                return slack.channels.setTopic(auth.slackToken, slackChannel.id, topic);
            })
            .then(() => {
                return slack.channels.leave(auth.slackToken, slackChannel.id);
            })
            .then(() => {
                const newPuzzle: IPuzzle = {
                    createdAt: spreadsheet.createdDate,
                    host: discoveredPage.host,
                    hunt: hunt.year,
                    name: puzzleName,
                    path: discoveredPage.path,
                    slackChannel: slackChannel.name,
                    slackChannelId: slackChannel.id,
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
                        firebaseDatabase.ref("eventLogs").push({
                            name: "PuzzleCreated",
                            puzzleId: puzzleKey,
                            timestampMs: Date.now(),
                            userId: auth.user.uid,
                        });
                        newPuzzle.key = puzzleKey;
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
export function saveHierarchyAction(hierarchy: IPuzzleHierarchy, puzzleChanges: {[key: string]: IPuzzleInfoChanges}) {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        let promises: Promise<void>[] = [];
        dispatch(asyncActionInProgressPayload<void>(SAVE_HIERARCHY_ACTION));
        let puzzleNamesWithUpdatedParents: string[] = [];
        Object.keys(hierarchy).forEach((groupKey) => {
            let childPromises = hierarchy[groupKey].children.map((puzzle) => {
                const updates = {
                    [`/puzzles/${puzzle.key}/parent`]: hierarchy[groupKey].parent.key,
                    [`/puzzles/${puzzle.key}/isMeta`]: hierarchy[puzzle.key] !== undefined,
                };
                puzzleNamesWithUpdatedParents.push(puzzle.name);

                // if the puzzle was null, then we rely on the parent for the puzzle link in the spreadsheet
                if (puzzle.host == null) {
                    promises.push(setSheetPuzzleLink(puzzle.spreadsheetId,
                    `http://${hierarchy[groupKey].parent.host}${hierarchy[groupKey].parent.path}`));
                }

                return new Promise<void>((resolve) => {
                    firebaseDatabase.ref().update(updates).then(() => {
                        resolve();
                    }, (error) => {
                        throw error;
                    });
                });
            });
            promises = promises.concat(childPromises);
            promises.push(new Promise<void>((resolve) => {
                firebaseDatabase.ref().update({
                    [`/puzzles/${groupKey}/isMeta`]: true,
                }).then(() => {
                    resolve();
                }, (error) => {
                    throw error;
                });
            }));
        });
        let puzzlesWithNoParents = getState().puzzles.value.filter((puzzle) => {
            return puzzleNamesWithUpdatedParents.indexOf(puzzle.name) < 0;
        });
        puzzlesWithNoParents.forEach((puzzle) => {
            promises.push(new Promise<void>((resolve) => {
                firebaseDatabase.ref().update({
                    [`/puzzles/${puzzle.key}/parent`]: null,
                }).then(() => resolve(),
                (error) => {
                    throw error
                });
            }));
            promises.push(setSheetPuzzleLink(puzzle.spreadsheetId));
        });
        Object.keys(puzzleChanges).forEach((puzzleKey) => {
            const updates = {
                [`/puzzles/${puzzleKey}/name`]: puzzleChanges[puzzleKey].title,
            };
            promises.push(new Promise<void>((resolve) => {
                firebaseDatabase.ref().update(updates).then(() => { resolve() }
            , (error) => {
                throw error;
            })}));
        });
        Promise.all(promises).then(() => {
            dispatch(asyncActionSucceededPayload<void>(SAVE_HIERARCHY_ACTION));
            loadPuzzlesAction(getState().hunt.value.year)(dispatch);
        }).catch((error) => {
            dispatch(asyncActionFailedPayload<void>(SAVE_HIERARCHY_ACTION, error));
        });
    };
}