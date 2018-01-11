var admin = require('firebase-admin');
var config = require('./config').config;
var WebClient = require('@slack/client').WebClient;

const postChannel = config.channel;
var startTime = Date.now() - 120;


// Initialization
var slack = new WebClient(config.slack.token);
admin.initializeApp(config.firebase);

// Firebase handlers initialization
admin.database().ref('eventLogs').orderByChild("timestampMs").startAt(startTime).on('child_added', handleEvent);

console.log('Done with initialization');

function handleEvent(snap) {
    event = snap.val();
    if (event.timestampMs > startTime) {
        if (event.name === 'PuzzleCreated') {
            admin.database().ref('puzzles').child(event.puzzleId).once("value", function(snap) {
                protectedSlackMessage(snap.key, postChannel, makeNewPuzzleMessage(snap.val()));
            });
        } else if (event.name === 'PuzzleSolutionChanged') {
            var puzzleRef = admin.database().ref('puzzles').child(event.puzzleId);
            var userRef = admin.database().ref('users').child(event.userId);

            onceValue2(puzzleRef, userRef, function(puzzle, user) {
                protectedSlackMessage(snap.key, postChannel, makeSolvedMessage(puzzle, user), ':pikadance:');
            });
        }
    }
}


function protectedSlackMessage(eventKey, channel, message, emoji) {
    var eventRef = admin.database().ref('eventLogs/' + eventKey);
    eventRef.transaction(function(currentData) {
        if (currentData.slackBotMessageSent) {
            return; // Abort
        } else {
            currentData.slackBotMessageSent = true;
            return currentData;
        }
    }, function(error, committed, snap) {
        if (error) {
            console.log('Sending message failed abnormally', error);
        } else if (!committed) {
            console.log('Aborted message send because we\'ve already sent it');
        } else {
            postSlackMessage(channel, message, emoji);
        }
    });
}


// Slack
function postSlackMessage(channel, message, emoji) {
    emoji = (typeof emoji !== 'undefined') ? emoji : ':callitin:';
    slack.chat.postMessage(
        channel,
        message, {
            icon_emoji: emoji,
            username: 'SuperTeamAwesomeBot',
        },
        function(err, res) {
        if (err) {
            console.log('Error:', err);
            return false;
        } else {
            console.log('Message sent: ', message);
            return true;
        }
    });
}


// Utility
function makeSolvedMessage(puzzle, user) {
    return makeSlackUserTag(user) + ' has solved ' + puzzle.name +
           ' (' + makePuzzleAddress(puzzle) + ') :correct:' +
           (puzzle.solution ? '\n Solution: `' + puzzle.solution + '`' : '');
}

function makeNewPuzzleMessage(puzzle) {
    return puzzle.name + (puzzle.isMeta ? ' META' : '') + ' has been unlocked!\n' +
           makePuzzleAddress(puzzle) + '\n' +
           'Join the slack channel ' + makeSlackChannelLink(puzzle);
}

function makePuzzleAddress(puzzle) {
    return 'http://' + puzzle.host + puzzle.path;
}

function makeSlackChannelLink(puzzle) {
    return '<#' + puzzle.slackChannelId + '|' + puzzle.slackChannel + '>';
}

function makeSlackUserTag(user) {
    if (user.slackUserId) {
        return '<@' + user.slackUserId + '>';
    }
    else {
        return user.displayName;
    }
}


/**
 * Takes two firebase refs and attaches `value` event listeners on them, calling
 * the given callback when both are resolved.
 */
function onceValue2(ref1, ref2, callback) {
    var snap1 = null;
    var snap2 = null;
    function update() {
        if (snap1 && snap1.val() &&
            snap2 && snap2.val()) {
            callback(snap1.val(), snap2.val());
        }
    }
    function on1(snap) { snap1 = snap; update(); }
    function on2(snap) { snap2 = snap; update(); }
    ref1.once("value", on1);
    ref2.once("value", on2);
}