/// <reference path="../../../typings/custom/gapi.d.ts" />

import * as firebase from "firebase";
import { IGoogleDriveFile, IGoogleShortUrl } from "gapi";
import { Dispatch } from "redux";

import { IDiscoveredPage, IPuzzle, PuzzleStatus } from "../../../../server/api/puzzleApi";
import { firebaseDatabase } from "../../auth";
import { createSheet, deleteSheet, getShortUrl, setSheetLinks } from "../../services/googleService";
import { ISlackChannel, slack } from "../../services/slackService";
import { IAppState } from "../state";
import { asyncActionFailedPayload, asyncActionInProgressPayload, asyncActionSucceededPayload } from "./loading";

export const LOAD_PUZZLES_ACTION = "LOAD_PUZZLES";
export function loadPuzzlesAction(huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IPuzzle[]>(LOAD_PUZZLES_ACTION));
        firebaseDatabase
            .ref("puzzles")
            .orderByChild("hunt")
            .equalTo(huntKey)
            .on(
                "value",
                snapshot => {
                    let puzzles: IPuzzle[] = [];
                    snapshot.forEach(puzzleSnapshot => {
                        puzzles.push({ ...puzzleSnapshot.val(), key: puzzleSnapshot.key });
                        return false;
                    });

                    puzzles.sort((a: IPuzzle, b: IPuzzle) => {
                        const aDate = new Date(a.createdAt);
                        const bDate = new Date(b.createdAt);
                        return aDate.valueOf() - bDate.valueOf();
                    });

                    puzzles = puzzles.map((puzzle, index) => ({ ...puzzle, index }));
                    dispatch(asyncActionSucceededPayload<IPuzzle[]>(LOAD_PUZZLES_ACTION, puzzles));
                },
                (error: Error) => {
                    dispatch(asyncActionFailedPayload<IPuzzle[]>(LOAD_PUZZLES_ACTION, error));
                },
            );
    };
}

export const LOAD_DISCOVERED_PUZZLES_ACTION = "LOAD_DISCOVERED_PUZZLES";
export function loadDiscoveredPagesAction(huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IDiscoveredPage[]>(LOAD_DISCOVERED_PUZZLES_ACTION));
        firebaseDatabase.ref(`discoveredPages/${huntKey}`).on(
            "value",
            (snapshot: firebase.database.DataSnapshot) => {
                const discoveredPages: IDiscoveredPage[] = [];
                snapshot.forEach((discoveredPuzzleSnapshot: firebase.database.DataSnapshot) => {
                    if (!discoveredPuzzleSnapshot.val().ignored) {
                        discoveredPages.push({ ...discoveredPuzzleSnapshot.val(), key: discoveredPuzzleSnapshot.key });
                    }
                    return false;
                });
                dispatch(
                    asyncActionSucceededPayload<IDiscoveredPage[]>(LOAD_DISCOVERED_PUZZLES_ACTION, discoveredPages),
                );
            },
            (error: Error) => {
                asyncActionFailedPayload<IDiscoveredPage[]>(LOAD_DISCOVERED_PUZZLES_ACTION, error);
            },
        );
    };
}

export const LOAD_IGNORED_PAGES_ACTION = "LOAD_IGNORED_PAGES";
export function loadIgnoredPagesAction(huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IDiscoveredPage[]>(LOAD_IGNORED_PAGES_ACTION));
        firebaseDatabase.ref(`discoveredPages/${huntKey}`).once(
            "value",
            (snapshot: firebase.database.DataSnapshot) => {
                const ignoredPages: IDiscoveredPage[] = [];
                snapshot.forEach((discoveredPuzzleSnapshot: firebase.database.DataSnapshot) => {
                    if (discoveredPuzzleSnapshot.val().ignored) {
                        ignoredPages.push({ ...discoveredPuzzleSnapshot.val(), key: discoveredPuzzleSnapshot.key });
                    }
                    return false;
                });
                dispatch(asyncActionSucceededPayload<IDiscoveredPage[]>(LOAD_IGNORED_PAGES_ACTION, ignoredPages));
            },
            (error: Error) => {
                asyncActionFailedPayload<IDiscoveredPage[]>(LOAD_IGNORED_PAGES_ACTION, error);
            },
        );
    };
}

export const SAVE_DISCOVERED_PAGE_CHANGES_ACTION = "SAVE_DISCOVERED_PAGE_CHANGES";
export interface IPuzzleInfoChanges {
    title?: string;
    link?: string;
}
export function saveDiscoveredPageChangesAction(changes: { [key: string]: IPuzzleInfoChanges }) {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<IDiscoveredPage[]>(SAVE_DISCOVERED_PAGE_CHANGES_ACTION));
        const huntKey = getState().activeHunt.value.year;
        const changePromises: Array<Promise<IDiscoveredPage>> = [];
        Object.keys(changes).forEach(key => {
            const updates: { [key: string]: string } = {};
            if (changes[key].title !== undefined) {
                updates[`/discoveredPages/${huntKey}/${key}/title`] = changes[key].title;
            }
            if (changes[key].link !== undefined) {
                updates[`/discoveredPages/${huntKey}/${key}/link`] = changes[key].link;
            }
            if (Object.keys(updates).length > 0) {
                const changePromise = new Promise<IDiscoveredPage>(resolve => {
                    firebaseDatabase
                        .ref()
                        .update(updates)
                        .then(
                            () => {
                                firebaseDatabase
                                    .ref(`discoveredPages/${huntKey}/${key}`)
                                    .once("value", (snapshot: firebase.database.DataSnapshot) => {
                                        resolve({ ...snapshot.val(), key: snapshot.key });
                                    });
                            },
                            error => {
                                throw error;
                            },
                        );
                });
                changePromises.push(changePromise);
            }
        });

        Promise.all(changePromises)
            .then((changedPages: IDiscoveredPage[]) => {
                dispatch(
                    asyncActionSucceededPayload<IDiscoveredPage[]>(SAVE_DISCOVERED_PAGE_CHANGES_ACTION, changedPages),
                );
            })
            .catch((error: Error) => {
                dispatch(asyncActionFailedPayload<IDiscoveredPage[]>(SAVE_DISCOVERED_PAGE_CHANGES_ACTION, error));
            });
    };
}

export const IGNORE_DISCOVERED_PAGE_ACTION = "IGNORE_PAGE";
export function ignoreDiscoveredPageAction(discoveredPage: IDiscoveredPage) {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        const hunt = getState().activeHunt.value;
        dispatch(asyncActionInProgressPayload<IDiscoveredPage[]>(IGNORE_DISCOVERED_PAGE_ACTION));
        firebaseDatabase
            .ref(`discoveredPages/${hunt.year}/${discoveredPage.key}/ignored`)
            .set(true)
            .then(
                () => {
                    dispatch(
                        asyncActionSucceededPayload<IDiscoveredPage[]>(IGNORE_DISCOVERED_PAGE_ACTION, [
                            { ...discoveredPage, ignored: true },
                        ]),
                    );
                },
                (error: Error) => {
                    dispatch(asyncActionFailedPayload<IDiscoveredPage[]>(IGNORE_DISCOVERED_PAGE_ACTION, error));
                },
            );
    };
}

export function ignoreDiscoveredPageFromKey(discoveredPageKey: string, huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        firebaseDatabase.ref(`discoveredPages/${huntKey}/${discoveredPageKey}`).once("value", snapshot => {
            const page: IDiscoveredPage = snapshot.val();
            dispatch(ignoreDiscoveredPageAction({ ...page, key: discoveredPageKey }));
        });
    };
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
                return new Promise<void>(resolve => {
                    firebaseDatabase
                        .ref(`puzzles/${puzzle.key}`)
                        .set(null)
                        .then(
                            () => {
                                resolve();
                            },
                            error => {
                                throw error;
                            },
                        );
                });
            })
            .then(() => {
                dispatch(asyncActionSucceededPayload<void>(DELETE_PUZZLE_ACTION, undefined, puzzle.key));
            })
            .catch(error => {
                dispatch(asyncActionFailedPayload<void>(DELETE_PUZZLE_ACTION, error, puzzle.key));
            });
    };
}

export const ADD_META_ACTION = "ADD_META_PUZZLE";
export function addMetaAction(puzzle: IPuzzle) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<void>(ADD_META_ACTION, { key: puzzle.key }));
        firebaseDatabase
            .ref(`puzzles/${puzzle.key}/isMeta`)
            .set(true)
            .then(
                () => {
                    dispatch(asyncActionSucceededPayload<void>(ADD_META_ACTION, undefined, { key: puzzle.key }));
                },
                error => {
                    dispatch(asyncActionFailedPayload<void>(ADD_META_ACTION, error, { key: puzzle.key }));
                },
            );
    };
}

export const REMOVE_META_ACTION = "REMOVE_META_PUZZLE";
export function removeMetaAction(meta: IPuzzle, existingPuzzles: IPuzzle[]) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<void>(REMOVE_META_ACTION, { metaKey: meta.key, existingPuzzles }));
        const firebaseUpdates: { [key: string]: any } = {};
        firebaseUpdates[`puzzles/${meta.key}/isMeta`] = false;
        for (const childPuzzle of existingPuzzles) {
            firebaseUpdates[`puzzles/${childPuzzle.key}/parent`] = null;
            if (childPuzzle.parents != null) {
                firebaseUpdates[`puzzles/${childPuzzle.key}/parents`] = childPuzzle.parents.filter(
                    parentKey => parentKey !== meta.key,
                );
            }
        }
        firebaseDatabase.ref().update(firebaseUpdates, (error: Error | null) => {
            if (error == null) {
                dispatch(
                    asyncActionSucceededPayload<void>(REMOVE_META_ACTION, undefined, {
                        metaKey: meta.key,
                        existingPuzzles,
                    }),
                );
            } else {
                dispatch(
                    asyncActionFailedPayload<void>(REMOVE_META_ACTION, error, { metaKey: meta.key, existingPuzzles }),
                );
            }
        });
    };
}

export const ASSIGN_TO_META = "ASSIGN_TO_META_PUZZLE";
export function assignToMetaAction(puzzle: IPuzzle, metaPuzzleKeys: string[]) {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<void>(ASSIGN_TO_META, { key: puzzle.key, parent: metaPuzzleKeys }));
        firebaseDatabase
            .ref(`puzzles/${puzzle.key}`)
            .set({
                ...puzzle,
                parents: metaPuzzleKeys,
            })
            .then(
                async () => {
                    // Remove deprecate parent field
                    const deprecatedParent = await new Promise(resolve =>
                        firebaseDatabase
                            .ref(`puzzles/${puzzle.key}/parent`)
                            .once("value", snapshot => resolve(snapshot.val())),
                    );
                    if (deprecatedParent != null) {
                        await new Promise(resolve =>
                            firebaseDatabase.ref(`puzzles/${puzzle.key}/parent`).remove(() => resolve()),
                        );
                    }
                    dispatch(
                        asyncActionSucceededPayload<void>(ASSIGN_TO_META, undefined, {
                            key: puzzle.key,
                            parents: metaPuzzleKeys,
                        }),
                    );
                },
                error => {
                    dispatch(
                        asyncActionFailedPayload<void>(ASSIGN_TO_META, error, {
                            key: puzzle.key,
                            parents: metaPuzzleKeys,
                        }),
                    );
                },
            );
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
        const { auth, activeHunt: asyncHunt } = getState();
        const hunt = asyncHunt.value;

        const tempElement = document.createElement("a") as HTMLAnchorElement;
        tempElement.href = puzzleLink;
        const host = tempElement.hostname;
        const path = tempElement.pathname;

        const lowerCasePuzzleName = puzzleName.replace(/\ /g, "").toLowerCase();
        const puzzleKey = lowerCasePuzzleName + "-" + hunt.year;

        let cleanPuzzleName = lowerCasePuzzleName;
        // replace diacritics with pure ASCII ("über crèmebrulée" => "uber cremebrulee")
        cleanPuzzleName = cleanPuzzleName.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        // strip special chars ("#secretlivesofπ" => "secretlivesof")
        cleanPuzzleName = cleanPuzzleName.replace(/[^\w]/g, "");

        const slackChannelName = "x-" + cleanPuzzleName.substring(0, 19);

        const checkPuzzleExists = new Promise(resolve => {
            firebaseDatabase.ref(`puzzles/${puzzleKey}`).once(
                "value",
                snapshot => {
                    if (snapshot.val() == null) {
                        resolve(true);
                    } else {
                        throw new Error("Puzzle with that name already exists!");
                    }
                },
                (error: Error) => {
                    throw error;
                },
            );
        });

        let spreadsheet: IGoogleDriveFile;
        let slackChannel: ISlackChannel;
        let ignoreLink: boolean;
        let shortPuzzleUrl: string;
        checkPuzzleExists
            .then(() => {
                // save the domain if it doesn't exist
                return new Promise<void>(resolve => {
                    firebaseDatabase
                        .ref("huntHostNames")
                        .orderByChild("hostName")
                        .equalTo(host)
                        .once("value", snapshot => {
                            if (snapshot.numChildren() === 0) {
                                const key = hunt.year + host.substring(0, host.indexOf("."));
                                firebaseDatabase
                                    .ref(`huntHostNames/${key}`)
                                    .set({
                                        hostName: host,
                                        hunt: hunt.year,
                                    })
                                    .then(
                                        () => {
                                            resolve();
                                        },
                                        error => {
                                            throw error;
                                        },
                                    );
                            } else {
                                resolve();
                            }
                        });
                });
            })
            .then(() => {
                return new Promise<boolean>(resolve => {
                    firebaseDatabase
                        .ref("puzzles")
                        .orderByChild("path")
                        .equalTo(path)
                        .once("value", snapshot => {
                            snapshot.forEach(puzzleSnapshot => {
                                if ((puzzleSnapshot.val() as IPuzzle).host === host) {
                                    resolve(true);
                                    return true;
                                }
                                return false;
                            });
                            resolve(false);
                        });
                });
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
                return setSheetLinks(
                    spreadsheet.id,
                    puzzleLink,
                    `https://superteamawesome.slack.com/messages/${channel.name}`,
                );
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
                    .then(
                        () => {
                            newPuzzle.key = puzzleKey;
                            firebaseDatabase.ref("eventLogs").push({
                                name: "PuzzleCreated",
                                puzzleId: puzzleKey,
                                timestampMs: Date.now(),
                                userId: auth.user.uid,
                            });
                            dispatch(
                                asyncActionSucceededPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, {
                                    changedPages: [],
                                    newPuzzles: [newPuzzle],
                                }),
                            );
                            dispatch(asyncActionSucceededPayload<void>(CREATE_MANUAL_PUZZLE_ACTION));
                        },
                        error => {
                            dispatch(asyncActionFailedPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, error));
                        },
                    );
            })
            .catch(error => {
                dispatch(asyncActionFailedPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, error));
                dispatch(asyncActionFailedPayload<void>(CREATE_MANUAL_PUZZLE_ACTION, error));
            });
    };
}

export const CREATED_SINGLE_PUZZLE = "CREATED_SINGLE_PUZZLE";
export function createPuzzleFromKeyAction(discoveredPageKey: string, huntKey: string) {
    return (dispatch: Dispatch<IAppState>) => {
        firebaseDatabase.ref(`discoveredPages/${huntKey}/${discoveredPageKey}`).once("value", pageSnapshot => {
            const page: IDiscoveredPage = pageSnapshot.val();
            dispatch(createPuzzleAction(page.title, { ...page, key: discoveredPageKey })).then(() => {
                dispatch(asyncActionSucceededPayload<void>(CREATED_SINGLE_PUZZLE));
            });
        });
    };
}

export function createPuzzleAction(puzzleName: string, discoveredPage: IDiscoveredPage) {
    return (dispatch: Dispatch<IAppState>, getState: () => IAppState) => {
        const { auth, activeHunt: asyncHunt } = getState();
        const hunt = asyncHunt.value;
        const lowerCasePuzzleName = puzzleName.replace(/\ /g, "").toLowerCase();
        const puzzleKey = lowerCasePuzzleName + "-" + hunt.year;
        const slackChannelName = "x-" + lowerCasePuzzleName.substring(0, 19);

        dispatch(asyncActionInProgressPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION));

        const checkPuzzleExists = new Promise((resolve, reject) => {
            firebaseDatabase.ref(`puzzles/${puzzleKey}`).once(
                "value",
                snapshot => {
                    if (snapshot.val() != null) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                },
                (error: Error) => {
                    reject(error);
                },
            );
        });

        let spreadsheet: IGoogleDriveFile;
        let slackChannel: ISlackChannel;
        const puzzleLink = `http://${discoveredPage.host}${discoveredPage.path}`;
        let shortPuzzleUrl: string;
        return checkPuzzleExists
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
                return setSheetLinks(
                    spreadsheet.id,
                    puzzleLink,
                    `https://superteamawesome.slack.com/messages/${channel.name}`,
                );
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
                return firebaseDatabase
                    .ref(`puzzles/${puzzleKey}`)
                    .set(newPuzzle)
                    .then(
                        () => {
                            const removeFirebasePromise = new Promise(resolve => {
                                firebaseDatabase
                                    .ref(`discoveredPages/${hunt.year}/${discoveredPage.key}`)
                                    .set(null)
                                    .then(
                                        () => {
                                            resolve();
                                        },
                                        (error: Error) => {
                                            throw error;
                                        },
                                    );
                            });
                            firebaseDatabase.ref("eventLogs").push({
                                name: "PuzzleCreated",
                                puzzleId: puzzleKey,
                                timestampMs: Date.now(),
                                userId: auth.user.uid,
                            });
                            newPuzzle.key = puzzleKey;
                            return removeFirebasePromise.then(() => {
                                dispatch(
                                    asyncActionSucceededPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, {
                                        changedPages: [discoveredPage],
                                        newPuzzles: [newPuzzle],
                                    }),
                                );
                            });
                        },
                        error => {
                            dispatch(asyncActionFailedPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, error));
                        },
                    );
            })
            .catch(error => {
                dispatch(asyncActionFailedPayload<ICreatePuzzleActionPayload>(CREATE_PUZZLE_ACTION, error));
            });
    };
}
