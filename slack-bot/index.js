var admin = require('firebase-admin');
var config = require('./config').config;
var WebClient = require('@slack/client').WebClient;

const postChannel = 'lcarter-testing';
var huntAddress = '';


// Initialization
var slack = new WebClient(config.slack.token);
admin.initializeApp(config.firebase);


// Set up
var db_copy = {};
admin.database().ref("puzzles").once("value", function(snap) {
    db_copy = snap.val();
});
admin.database()
     .ref("hunts")
     .orderByChild("isCurrent")
     .equalTo(true)
     .limitToFirst(1)
     .on("value", function(huntSnapshots) {
        huntSnapshots.forEach(function(huntSnapshot) {
            huntAddress = huntSnapshot.val().domain;
            console.log('hunt address is ' + huntAddress);
        });
     });

// Firebase handlers initialization
admin.database().ref("puzzles").on("child_changed", handleFirebaseValueChange);
admin.database().ref("puzzles").on("child_added", handleFirebaseNewPuzzle);


// Firebase handlers
function handleFirebaseValueChange(snap) {
    // check if the puzzle is newly solved
    if (snap.val().status === 'solved' && db_copy[snap.key].status !== 'solved') {
        postSlackMessage(postChannel, makeSolvedMessage(snap.val()), ':pikadance:');
    }
    // update db_copy
    db_copy[snap.key] = snap.val();
}

function handleFirebaseNewPuzzle(snap) {
    postSlackMessage(postChannel, makeNewPuzzleMessage(snap.val()));
    // update db
    db_copy[snap.key] = snap.val();
}


// Slack
function postSlackMessage(channel, message, emoji) {
    emoji = (typeof emoji !== 'undefined') ? emoji : ':rice_ball:';
    slack.chat.postMessage(
        channel,
        message, {
            icon_emoji: emoji,
            username: "SuperTeamAwesomeBot",
        },
        function(err, res) {
        if (err) {
            console.log('Error:', err);
        } else {
            console.log('Message sent: ', message);
        }
    });
}


// Utility
function makeSolvedMessage(puzzle) {
    return puzzle.name + ' has been solved! :correct:';
}

function makeNewPuzzleMessage(puzzle) {
    return puzzle.name + ' has been unlocked! ' + makePuzzleAddress(puzzle.path);
}

function makePuzzleAddress(puzzlePath) {
    return 'http://' + huntAddress + puzzlePath;
}