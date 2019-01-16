// tslint:disable:no-console

import { WebClient } from "@slack/client";
import * as admin from "firebase-admin";

import { IPuzzle, PuzzleStatus } from "./api/puzzleApi";
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
firebaseDatabase.ref("currentHunt").on("value", huntSnapshot => {
    if (currentHuntKey !== undefined) {
        // Stop listening to the old hunt
        firebaseDatabase.ref(`discoveredPages/${currentHuntKey}`).off("child_added");
        firebaseDatabase.ref("puzzles").off("child_added");
        console.log("[slack-bot] Stopped listening to ", currentHuntKey);
    }
    currentHuntKey = huntSnapshot.val();

    // Start listening to the hunt

    // todo: figure out how to listen for reactions
    // firebaseDatabase.ref(`discoveredPages/${currentHuntKey}`).on("child_added", newPageSnapshot => {
    //     const newPage: IDiscoveredPage = newPageSnapshot.val();
    //     if (!newPage.ignored) {
    //         slackClient.chat.postMessage({
    //             channel: config.puzzleAlertChannel,
    //             text: `New puzzle page discovered: "${newPage.title}" (${newPage.host}${newPage.path})`,
    //         });
    //     }
    // });
    // console.log("[slack-bot] Started listening for new discovered pages for ", currentHuntKey);

    firebaseDatabase.ref("puzzles").on("child_added", newPuzzleSnapshot => {
        const puzzle: IPuzzle = newPuzzleSnapshot.val();
        if (puzzle.status === PuzzleStatus.NEW && puzzle.hunt === currentHuntKey && !puzzle.announced) {
            slackClient.chat
                .postMessage({
                    channel: config.puzzleAnnounceChannel,
                    text:
                        `${puzzle.name}${puzzle.isMeta ? " Meta" : ""} has been unlocked!\n` +
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
                    firebaseDatabase.ref(`puzzles/${newPuzzleSnapshot.key}/announced`).set(true);
                });
        }
    });
    console.log("[slack-bot] Started listening for new created puzzle pages for ", currentHuntKey);
});
