var Slack = (function() {

var slackUserId = null;
var slackChannelById = {};
var slackChannelIdByName = {};
var subscriberTabIdsByChannelId = {};

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
            initSlackRtm(snap.val());
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
                    initSlackRtm(response.access_token);
                });
            }
        });
    });
};

/**
 * @param accessToken
 */
function initSlackRtm(accessToken) {
    xhrGet("https://slack.com/api/rtm.start", {
        token: accessToken,
        simple_latest: true
    }, function(response) {
        console.log("[slack/rtm.start]", response);
        var ws = new WebSocket(response.url);
        ws.onmessage = handleSlackWsMessage;

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
        case "channel_marked":
            var channel = slackChannelById[msg.channel];
            channel.unread_count = msg.unread_count;
            channel.unread_count_display = msg.unread_count_display;
            notifySubscribers(channel);
            break;
        case "message":
            var channel = slackChannelById[msg.channel];
            if (msg.user !== slackUserId && channel) {
                channel.unread_count++;
                channel.unread_count_display++;
                notifySubscribers(channel);
            }
            break;
    }
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
            callback(JSON.parse(xhr.responseText));
        }
    }
}
