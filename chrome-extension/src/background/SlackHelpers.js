import * as firebase from "firebase";

import config from "./config"

let accessToken = null;
let slackUserId = null;
let webSocket = null;
let wsOutgoingMessageCounter = 0;
let pingInterval = null;
let pingOk = true;
let isThrottled = false;

export let connectionInfo = new Promise();

let slackChannelById = {};
let wsMessageConfirmationCallbacks = {};

/** "disconnected" | "connecting" | "authorized" | "connected" | "error"; */
let connectState = "disconnected";
const connectStateListeners = [];

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
    if (state === "connected") {
        pingOk = true;
        pingInterval = setInterval(function() {
            if (!pingOk) {
                // Haven't received response for previous ping yet. Disconnect.
                disconnect();
            } else {
                pingOk = false;
                maybeSend({
                    type: "ping",
                    timestamp: Date.now()
                }, function() { pingOk = true; });
            }
        }, 3000);
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
    const slackTokenRef = firebase.database().ref("userPrivateData")
        .child(firebase.auth().currentUser.uid).child("slackAccessToken");
    slackTokenRef.once("value", function(snap) {
        if (snap.val()) {
            accessToken = snap.val();
            initSlackRtm();
            return;
        }
        setConnectState("connecting");

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
                const queryString = redirectUrl.split("?")[1];
                const matchCode = queryString.match(/code=([^&]+)/);
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
    wsOutgoingMessageCounter = 0;
    wsMessageConfirmationCallbacks = {};
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
    setConnectState("disconnected");
}

let isStartingRtm = false;
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
            notifySubscribers({ type: "sta_rtm_start" }, channel);
        });
        connectionInfo = response;

        const userInfoRef = firebase.database().ref("users")
            .child(firebase.auth().currentUser.uid);
        userInfoRef.child("slackUserName").set(response.self.name);
        userInfoRef.child("slackUserId").set(slackUserId);
    });
}

function handleSlackWsMessage(event) {
    const msg = JSON.parse(event.data);
    console.log("[slack/rtm.message]", msg);
    switch (msg.type) {
        case "hello":
            setConnectState("connected");
            break;
        case "channel_created":
            slackChannelById[msg.channel.id] = msg.channel;
            break;
        case "channel_joined":
            if (!slackChannelById.hasOwnProperty(msg.channel.id)) {
                slackChannelById[msg.channel.id] = msg.channel;
            } else {
                Object.assign(slackChannelById[msg.channel.id], msg.channel);
            }
            slackChannelById[msg.channel.id] = msg.channel;
            notifySubscribers(msg, slackChannelById[msg.channel.id]);
            break;
        case "channel_left":
            var channel = slackChannelById[msg.channel];
            channel.is_member = false;
            notifySubscribers(msg, channel);
            break;
        case "channel_marked":
            var channel = slackChannelById[msg.channel];
            channel.unread_count = msg.unread_count;
            channel.unread_count_display = msg.unread_count_display;
            channel.last_read = msg.ts;
            notifySubscribers(msg, channel);
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
            }
            notifySubscribers(msg, channel);
            break;
        case "user_typing":
            var channel = slackChannelById[msg.channel];
            channel.user_typing = true;
            if (channel.user_typing_timeout) {
                clearTimeout(channel.user_typing_timeout);
            }
            channel.user_typing_timeout = setTimeout(() => {
                channel.user_typing_timeout = null;
                channel.user_typing = false;
                notifySubscribers({ type: "not_typing" }, channel);
            }, 2000);
            notifySubscribers(msg, channel);
            break;
    }

    if (
        msg.hasOwnProperty("reply_to") &&
        wsMessageConfirmationCallbacks.hasOwnProperty(msg.reply_to)
    ) {
        wsMessageConfirmationCallbacks[msg.reply_to](msg);
        delete wsMessageConfirmationCallbacks[msg.reply_to];
    }
}

export function getChannelInfo(channelId, callback) {
    xhrGet("https://slack.com/api/channels.info", {
        token: accessToken,
        channel: channelId
    }, callback);
}

export function getChannelHistory(channelId, callback) {
    xhrGet("https://slack.com/api/channels.history", {
        token: accessToken,
        channel: channelId,
        count: 1000,
    }, callback);
}

export function joinChannel(channelName) {
    xhrGet("https://slack.com/api/channels.join", {
        token: accessToken,
        name: channelName
    });
}

export function markChannel(channelId, ts) {
    xhrGet("https://slack.com/api/channels.mark", {
        token: accessToken,
        channel: channelId,
        ts
    });
}

const subscriberTabIdsByChannelId = {};
export function subscribeToChannel(key, channelId, callback) {
    connect(/*interactive*/false);

    if (!subscriberTabIdsByChannelId.hasOwnProperty(channelId)) {
        subscriberTabIdsByChannelId[channelId] = {};
    }
    subscriberTabIdsByChannelId[channelId][key] = callback;
    callback({ type: "sta_subscribe" }, slackChannelById[channelId]);
    return function unsubscribe() {
        delete subscriberTabIdsByChannelId[channelId][key];
        if (Object.keys(subscriberTabIdsByChannelId[channelId]).length === 0) {
            delete subscriberTabIdsByChannelId[channelId];
        }
    };
}

function notifySubscribers(msg, channel) {
    if (!channel) {
        // might be a DM or group that we don't care about
        return;
    }
    const subscriberMap = subscriberTabIdsByChannelId[channel.id];
    if (subscriberMap) {
        Object.keys(subscriberMap).forEach(function(k) {
            subscriberMap[k](msg, channel);
        });
    }
}

function maybeSend(data, callback) {
    if (webSocket) {
        const id = ++wsOutgoingMessageCounter;
        if (typeof callback === "function") {
            wsMessageConfirmationCallbacks[id] = callback;
        }
        const msg = Object.assign({}, data, { id });
        console.log("[slack/rtm.send]", msg);
        webSocket.send(JSON.stringify(msg));
    }
}

export function throttle(fn, msThrottle) {
    return function() {
        if (!isThrottled) {
            fn.apply(null, arguments);
            isThrottled = true;
            setTimeout(function() {
                isThrottled = false;
            }, msThrottle);
        }
    };
}

export function sendMessage(channelId, message, callback) {
    if (webSocket) {
        maybeSend({
            type: "message",
            channel: channelId,
            text: message
        }, callback);
    }
}

export function sendTypingIndicator(channelId) {
    if (webSocket) {
        maybeSend({
            type: "typing",
            channel: channelId
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
