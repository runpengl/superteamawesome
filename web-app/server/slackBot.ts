// tslint:disable:no-console

import { ChatPostMessageArguments, WebClient } from "@slack/client";
import * as admin from "firebase-admin";

import { IDiscoveredPage, IPuzzle, PuzzleStatus } from "./api/puzzleApi";
import { config } from "./config/config";

// tslint:disable-next-line:no-var-requires
const firebaseServiceAccount = require("./config/superteamawesome-firebase-adminsdk.json");
admin.initializeApp({
    credential: admin.credential.cert(firebaseServiceAccount),
    databaseURL: "https://superteamawesome-992.firebaseio.com",
    databaseAuthVariableOverride: {
        uid: "slack-bot-server",
    },
});
const firebaseDatabase = admin.database();
console.log("[slack-bot] Initializing slack bot...");
const slackClient = new WebClient(config.slackToken);

// Make sure we're looking at the current hunt
let currentHuntKey: string | undefined;
let puzzles: IPuzzle[] = [];
firebaseDatabase.ref("currentHunt").on("value", huntSnapshot => {
    if (currentHuntKey !== undefined) {
        // Stop listening to the old hunt
        firebaseDatabase.ref(`discoveredPages/${currentHuntKey}`).off("child_added");
        firebaseDatabase.ref("puzzles").off("child_added");
        firebaseDatabase.ref("puzzles").off("child_changed");
        puzzles = [];
        console.log("[slack-bot] Stopped listening to ", currentHuntKey);
    }
    currentHuntKey = huntSnapshot.val();

    // Start listening to the hunt

    // todo: figure out how to listen for reactions
    firebaseDatabase.ref(`discoveredPages/${currentHuntKey}`).on("child_added", async newPageSnapshot => {
        const newPage: IDiscoveredPage = newPageSnapshot.val();
        if (!newPage.ignored && !newPage.slackAnnounced) {
            const transactionResult = await firebaseDatabase
                .ref(`discoveredPages/${currentHuntKey}/${newPageSnapshot.key}/slackAnnounced`)
                .transaction(currentAnnounced => {
                    if (currentAnnounced == null || !currentAnnounced) {
                        console.log(`[slack-bot] Announcing new discovered page ${newPageSnapshot.key} on slack`);
                        return true;
                    }
                    // It's already done, fail the transaction
                    return currentAnnounced;
                });
            if (transactionResult.committed) {
                slackClient.chat.postMessage({
                    channel: config.puzzleAlertChannel,
                    text: `New puzzle page discovered: "${newPage.title}" (${newPage.host}${newPage.path})`,
                    attachments: [
                        {
                            fallback: `Make new puzzle or ignore it at ${config.webAppUrl}/admin`,
                            actions: [
                                {
                                    type: "button",
                                    text: "Make slack & sheet in admin site",
                                    style: "primary",
                                    url: `${config.webAppUrl}/admin`,
                                },
                                {
                                    type: "button",
                                    text: "Ignore page",
                                    style: "danger",
                                    url: `${config.webAppUrl}/admin/puzzle/${newPageSnapshot.key}/ignore`,
                                },
                            ],
                        },
                    ],
                });
            }
        }
    });
    console.log("[slack-bot] Started listening for new discovered pages for ", currentHuntKey);

    firebaseDatabase.ref("puzzles").on("child_added", newPuzzleSnapshot => {
        const puzzle: IPuzzle = newPuzzleSnapshot.val();
        puzzles.push({
            ...puzzle,
            key: newPuzzleSnapshot.key,
        });
        if (
            puzzle.status === PuzzleStatus.NEW &&
            puzzle.hunt === currentHuntKey &&
            (puzzle.slackAnnounceStatus == null || !puzzle.slackAnnounceStatus.createdAnnounced)
        ) {
            slackClient.chat
                .postMessage({
                    channel: config.puzzleAnnounceChannel,
                    text:
                        `@here ${puzzle.name}${puzzle.isMeta ? " Meta" : ""} has been unlocked!\n` +
                        `Join slack channel: <#${puzzle.slackChannelId}|${puzzle.slackChannel}>`,
                    attachments: [
                        {
                            fallback: `View puzzle at http://${puzzle.host}${puzzle.path}`,
                            actions: [
                                {
                                    type: "button",
                                    text: "View puzzle",
                                    url: `http://${puzzle.host}${puzzle.path}`,
                                    style: "primary",
                                },
                                {
                                    type: "button",
                                    text: "View spreadsheet",
                                    url: `https://docs.google.com/spreadsheets/d/${puzzle.spreadsheetId}/edit`,
                                },
                            ],
                        },
                    ],
                })
                .then(() => {
                    // mark puzzle as announced
                    console.log(`[slack-bot] ${newPuzzleSnapshot.key} was announced on Slack`);
                    firebaseDatabase
                        .ref(`puzzles/${newPuzzleSnapshot.key}/slackAnnounceStatus/createdAnnounced`)
                        .set(true);
                });
        }
    });
    console.log("[slack-bot] Started listening for new created puzzle pages for ", currentHuntKey);

    firebaseDatabase.ref("puzzles").on("child_changed", async changedPuzzleSnapshot => {
        const puzzle: IPuzzle = changedPuzzleSnapshot.val();

        // Update the cache
        const currentPuzzle = puzzles.find(p => p.key === changedPuzzleSnapshot.key);
        const currentPuzzleIndex = puzzles.findIndex(p => p.key === changedPuzzleSnapshot.key);
        if (currentPuzzle !== undefined) {
            puzzles.splice(currentPuzzleIndex, 1, { ...puzzle, key: changedPuzzleSnapshot.key });
        }

        // Slack message if the puzzle was solved
        if (
            (puzzle.status === PuzzleStatus.SOLVED || puzzle.status === PuzzleStatus.BACKSOLVED) &&
            (currentPuzzle.status !== PuzzleStatus.SOLVED && currentPuzzle.status !== PuzzleStatus.BACKSOLVED) &&
            puzzle.hunt === currentHuntKey &&
            (puzzle.slackAnnounceStatus === undefined || !puzzle.slackAnnounceStatus.solvedAnnounced)
        ) {
            // Make a transaction to guarantee only one of these is sent
            const transactionResult = await firebaseDatabase
                .ref(`puzzles/${changedPuzzleSnapshot.key}/slackAnnounceStatus`)
                .child("solvedAnnounced")
                .transaction(currentAnnounced => {
                    if (currentAnnounced == null || !currentAnnounced) {
                        console.log(currentAnnounced);
                        console.log(`[slack-bot] Announcing ${changedPuzzleSnapshot.key} as solved on slack`);
                        return true;
                    }
                    // It's already done, fail the transaction
                    return currentAnnounced;
                });
            if (transactionResult.committed) {
                const slackMessage: Pick<
                    ChatPostMessageArguments,
                    Exclude<keyof ChatPostMessageArguments, "channel">
                > = {
                    text: `@here ${puzzle.name}${puzzle.isMeta ? " Meta" : ""} has been ${
                        puzzle.status === PuzzleStatus.SOLVED ? "solved" : "backsolved"
                    }!${puzzle.solution != null ? ` The answer was \`${puzzle.solution}\`` : ""}\n`,
                    attachments: [
                        {
                            fallback: `View puzzle at http://${puzzle.host}${puzzle.path}`,
                            actions: [
                                {
                                    type: "button",
                                    text: "View puzzle",
                                    url: `http://${puzzle.host}${puzzle.path}`,
                                    style: "primary",
                                },
                                {
                                    type: "button",
                                    text: "View spreadsheet",
                                    url: `https://docs.google.com/spreadsheets/d/${puzzle.spreadsheetId}/edit`,
                                },
                            ],
                        },
                    ],
                };

                // Tell the overall announce channel
                console.log(`[slack-bot] Posting to ${config.puzzleAnnounceChannel}`);
                await slackClient.chat.postMessage({ ...slackMessage, channel: config.puzzleAnnounceChannel });

                // Tell the puzzle channel
                console.log(`[slack-bot] Posting to puzzle channel ${puzzle.slackChannelId}`);
                await slackClient.chat.postMessage({ ...slackMessage, channel: puzzle.slackChannelId });

                if (puzzle.isMeta) {
                    // Tell child puzzles
                    const childPuzzles = puzzles.filter(
                        p =>
                            (p.parents != null && p.parents.indexOf(changedPuzzleSnapshot.key) >= 0) ||
                            p.parent === changedPuzzleSnapshot.key,
                    );
                    console.log(
                        `[slack-bot] Posting to child puzzles ${childPuzzles.map(p => p.slackChannelId).join(", ")}`,
                    );

                    try {
                        await Promise.all(
                            childPuzzles.map(childPuzzle =>
                                slackClient.chat.postMessage({
                                    ...slackMessage,
                                    text: `@here The meta for this puzzle (${puzzle.name} Meta) has been ${
                                        puzzle.status === PuzzleStatus.SOLVED ? "solved" : "backsolved"
                                    }!${puzzle.solution != null ? ` The answer was \`${puzzle.solution}\`.` : ""}${
                                        childPuzzle.status !== PuzzleStatus.SOLVED &&
                                        childPuzzle.status !== PuzzleStatus.BACKSOLVED
                                            ? " Maybe try backsolving?"
                                            : ""
                                    }\n`,
                                    channel: childPuzzle.slackChannelId,
                                    attachments: [
                                        {
                                            ...slackMessage.attachments[0],
                                            actions: [
                                                {
                                                    ...slackMessage.attachments[0].actions[0],
                                                    text: "View meta puzzle",
                                                },
                                                slackMessage.attachments[0].actions[1],
                                            ],
                                        },
                                    ],
                                }),
                            ),
                        );
                    } catch (error) {
                        console.error(`[slack-bot] Failed to send messages to some or all channels:`, error);
                    }
                }
            }
        }
    });
    console.log("[slack-bot] Started listening for puzzle changes for ", currentHuntKey);
});
