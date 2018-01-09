import * as firebase from "firebase";

import config from "./config"

var accessToken = null;
var slackUserId = null;
var slackChannelById = {};
var slackChannelIdByName = {};
var subscriberTabIdsByChannelName = {};
var webSocket = null;

/** "authorized" | "connected" | "error"; */
var connectState = null;
var connectStateListeners = [];

export function onConnectStateChanged(callback) {
    if (connectState) {
        callback(connectState);
    }
    connectStateListeners.push(callback);
    return function unsubscribe() {
        var idx = connectStateListeners.indexOf(callback);
        if (idx !== -1) {
            connectStateListeners.splice(idx, 1);
        }
    };
}

function setConnectState(state) {
    if (connectState === state) {
        return;
    }
    if (state === "error") {
        // When we try again, we should request a new access token.
        firebase.database().ref("userPrivateData")
            .child(firebase.auth().currentUser.uid)
            .child("slackAccessToken")
            .remove();
        accessToken = null;
    }
    console.log("[slack/connectState]", state);
    connectState = state;
    connectStateListeners.forEach(function(callback) {
        callback(state);
    });
}

/**
 * Retrieves a slack access token for the given user and initializes a
 * slack RTM session. New tokens are saved to `userPrivateData/$userId`.
 */
export function connect(interactive) {
    if (accessToken) {
        initSlackRtm();
    }
    var slackTokenRef = firebase.database().ref("userPrivateData")
        .child(firebase.auth().currentUser.uid).child("slackAccessToken");
    slackTokenRef.once("value", function(snap) {
        if (snap.val()) {
            accessToken = snap.val();
            initSlackRtm();
            return;
        }

        // Authorize Slack via chrome.identity API
        chrome.identity.launchWebAuthFlow({
            url: "https://slack.com/oauth/authorize" +
                "?client_id=" + config.slack.clientId +
                "&scope=client" +
                "&redirect_uri=" + chrome.identity.getRedirectURL("/slack_oauth") +
                "&team=T03A0NUTH",
            interactive: interactive
        }, function(redirectUrl) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                setConnectState("error");
            } else {
                var queryString = redirectUrl.split("?")[1];
                var matchCode = queryString.match(/code=([^&]+)/);
                if (matchCode) {
                    xhrGet("https://slack.com/api/oauth.access", {
                        client_id: config.slack.clientId,
                        client_secret: config.slack.clientSecret,
                        code: matchCode[1]
                    }, function(response) {
                        slackTokenRef.set(response.access_token);
                        accessToken = response.access_token;
                        initSlackRtm();
                    });
                }
            }
        });
    });
}

export function disconnect() {
    if (webSocket && webSocket.readyState !== WebSocket.CLOSED) {
        webSocket.close();
    }
    webSocket = null;
    slackChannelById = {};
    slackChannelIdByName = {};
}

var isStartingRtm = false;
function initSlackRtm() {
    if (webSocket || isStartingRtm) {
        return;
    }
    isStartingRtm = true; // Set a flag to prevent opening duplicate web sockets.
    setConnectState("authorized");

    xhrGet("https://slack.com/api/rtm.start", {
        token: accessToken,
        simple_latest: true
    }, function(response) {
        isStartingRtm = false;
        console.log("[slack/rtm.start]", response);
        if (!response.ok) {
            setConnectState("error");
            return;
        }

        webSocket = new WebSocket(response.url);
        webSocket.onmessage = handleSlackWsMessage;
        webSocket.onclose = function() {
            disconnect(); // clean up
        };

        slackUserId = response.self.id;
        response.channels.forEach(function(channel) {
            slackChannelById[channel.id] = channel;
            slackChannelIdByName[channel.name] = channel.id;
            notifySubscribers(channel);
        });

        var userInfoRef = firebase.database().ref("users")
            .child(firebase.auth().currentUser.uid);
        userInfoRef.child("slackUserName").set(response.self.name);
        userInfoRef.child("slackUserId").set(slackUserId);
    });
}

function handleSlackWsMessage(event) {
    var msg = JSON.parse(event.data);
    switch (msg.type) {
        case "hello":
            setConnectState("connected");
            break;
        case "channel_created":
            slackChannelById[msg.channel.id] = msg.channel;
            slackChannelIdByName[msg.channel.name] = msg.channel.id;
            break;
        case "channel_joined":
            slackChannelById[msg.channel.id] = msg.channel;
            notifySubscribers(msg.channel);
            break;
        case "channel_left":
            var channel = slackChannelById[msg.channel];
            channel.is_member = false;
            notifySubscribers(channel);
            break;
        case "channel_marked":
            var channel = slackChannelById[msg.channel];
            channel.unread_count = msg.unread_count;
            channel.unread_count_display = msg.unread_count_display;
            notifySubscribers(channel);
            break;
        case "message":
            if (msg.subtype) {
                // We only care about regular messages.
                // See https://api.slack.com/events/message for more details.
                return;
            }
            var channel = slackChannelById[msg.channel];
            if (msg.user !== slackUserId && channel) {
                channel.unread_count++;
                channel.unread_count_display++;
                notifySubscribers(channel);
            }
            break;
    }
}

export function joinChannel(channelName) {
    xhrGet("https://slack.com/api/channels.join", {
        token: accessToken,
        name: channelName
    });
}

export function subscribeToChannel(tabId, channelName, callback) {
    connect(/*interactive*/false);

    if (!subscriberTabIdsByChannelName.hasOwnProperty(channelName)) {
        subscriberTabIdsByChannelName[channelName] = {};
    }
    subscriberTabIdsByChannelName[channelName][tabId] = callback;
    if (slackChannelIdByName[channelName]) {
        callback(slackChannelById[slackChannelIdByName[channelName]]);
    }
    return function unsubscribe() {
        delete subscriberTabIdsByChannelName[channelName][tabId];
        if (Object.keys(subscriberTabIdsByChannelName[channelName]).length === 0) {
            delete subscriberTabIdsByChannelName[channelName];
        }
    };
}

function notifySubscribers(channel) {
    var subscriberMap = subscriberTabIdsByChannelName[channel.name];
    if (subscriberMap) {
        Object.keys(subscriberMap).forEach(function(k) {
            subscriberMap[k](channel);
        });
    }
}

//
// XMLHttpRequest Helpers
// ----------------------------------------------------------------------------

function xhrGet(url, params, callback) {
    var fullUrl = url + "?" +
        Object.keys(params).map(function(k) {
            return k + "=" + params[k];
        }).join("&");

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = handleReadyStateChange;
    xhr.open("GET", fullUrl, /*async=*/true);
    xhr.send();

    function handleReadyStateChange() {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            if (callback) {
                callback(JSON.parse(xhr.responseText));
            }
        }
    }
}
