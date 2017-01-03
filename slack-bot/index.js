var firebase = require('firebase');
var config = require('./config').config;
var WebClient = require('@slack/client').WebClient;

// Initialization
firebase.initializeApp(config.firebase);
var slack = new WebClient(config.slack.token);
//firebase.auth().onAuthStateChanged(handleFirebaseAuthStateChange);

// Keep this data synced for faster toolbar initialization
firebase.database().ref("hunts").on("value", handleFirebaseValueChange);

function handleFirebaseValueChange(value) {
    console.log(value);
}

function handleFirebaseAuthStateChange(user) {
    // Save info so other clients can display a list of users viewing a puzzle
    firebase.database().ref("users/" + user.uid).set({
        displayName: user.displayName,
        photoUrl: user.photoURL
    });
}


// Slack


slack.chat.postMessage(
    'lcarter-testing',
    'Hello there', {
        icon_emoji: ":dancingjulia:",
        username: "SuperTeamAwesomeBot",
    },
    function(err, res) {
    if (err) {
        console.log('Error:', err);
    } else {
        console.log('Message sent: ', res);
    }
});