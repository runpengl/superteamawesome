var admin = require('firebase-admin');
var config = require('./config').config;
var WebClient = require('@slack/client').WebClient;

// Initialization
var slack = new WebClient(config.slack.token);

admin.initializeApp(config.firebase);
admin.database().ref("puzzles").on("child_changed", handleFirebaseValueChange);

// Set up
var db_copy = {};
admin.database().ref("puzzles").once("value", function(snap) {
    db_copy = snap.val();
});



// Firebase
function handleFirebaseValueChange(snap) {
    console.log(snap.key);
    console.log(snap.val());
    // check if the puzzle is newly solved
    if (snap.val().status === 'solved' && db_copy[snap.key].status != 'solved') {
        console.log('Solved', snap.val().name);
    }
    // update db_copy
    db_copy[snap.key] = snap.val();
}

// Slack
function postSlackMessage(slack, channel, msg) {
    slack.chat.postMessage(
        channel,
        message, {
            icon_emoji: ":rice_ball:",
            username: "SuperTeamAwesomeBot",
        },
        function(err, res) {
        if (err) {
            console.log('Error:', err);
        } else {
            console.log('Message sent: ', res);
        }
    });
}
