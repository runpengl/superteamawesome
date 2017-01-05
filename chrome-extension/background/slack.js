var Slack = (function() {

var accessToken = null;
var slackUserId = null;
var slackChannelById = {};
var slackChannelIdByName = {};
var subscriberTabIdsByChannelId = {};
var webSocket = null;

/**
 * Retrieves a slack access token for the given user and initializes a
 * slack RTM session. New tokens are saved to `userPrivateData/$userId`.
 * @param userId
 */
function connect(userId) {
    var slackTokenRef = firebase.database().ref("userPrivateData")
        .child(userId).child("slackAccessToken");
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
                "&redirect_uri=" + chrome.identity.getRedirectURL("/slack_oauth"),
            interactive: true
        }, function(redirectUrl) {
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
        });
    });
}

function disconnect() {
    if (webSocket && webSocket.readyState !== WebSocket.CLOSED) {
        webSocket.close();
        webSocket = null;
    }
    slackChannelById = {};
    slackChannelIdByName = {};
}

function initSlackRtm() {
    xhrGet("https://slack.com/api/rtm.start", {
        token: accessToken,
        simple_latest: true
    }, function(response) {
        console.log("[slack/rtm.start]", response);
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
    });
}

function handleSlackWsMessage(event) {
    var msg = JSON.parse(event.data);
    switch (msg.type) {
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
            if (msg.subtype === "message_deleted") {
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

function joinChannel(channelName) {
    xhrGet("https://slack.com/api/channels.join", {
        token: accessToken,
        name: channelName
    });
}

function subscribeToChannel(tabId, channelName, callback) {
    var channelId = slackChannelIdByName[channelName];
    if (!subscriberTabIdsByChannelId.hasOwnProperty(channelId)) {
        subscriberTabIdsByChannelId[channelId] = {};
    }
    subscriberTabIdsByChannelId[channelId][tabId] = callback;
    if (slackChannelById[channelId]) {
        callback(slackChannelById[channelId]);
    }
    return function unsubscribe() {
        delete subscriberTabIdsByChannelId[channelId][tabId];
        if (Object.keys(subscriberTabIdsByChannelId[channelId]).length === 0) {
            delete subscriberTabIdsByChannelId[channelId];
        }
    };
}

function notifySubscribers(channel) {
    var subscriberMap = subscriberTabIdsByChannelId[channel.id];
    if (subscriberMap) {
        Object.keys(subscriberMap).forEach(function(k) {
            subscriberMap[k](channel);
        });
    }
}

return {
    connect: connect,
    disconnect: disconnect,
    joinChannel: joinChannel,
    subscribeToChannel: subscribeToChannel
};
})();

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
