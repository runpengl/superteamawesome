injectToolbar();
monitorPresence();

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.msg) {
        case "injectChatWidget":
            injectChatWidget(request.chatWidgetState);
            break;
        case "removeChatWidget":
            removeChatWidget();
            break;
    }
});

function injectToolbar() {
    if (document.getElementById("sta_toolbar")) {
        return;
    }
    var toolbarHeight = "24px";

    // Set up iframe
    var iframe = document.createElement("iframe");
    iframe.id = "sta_toolbar";
    iframe.src = chrome.extension.getURL("toolbar/toolbar.html");
    iframe.style.background = "#fff";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.height = toolbarHeight;
    iframe.style.width = "100%";
    iframe.style.zIndex = "99999";

    // Some full-screen web-apps like google docs and slack don't respond well
    // to transform styles on the body, so we special-case their injection here.
    if (window.location.hostname === "docs.google.com") {
        var docsChrome = document.getElementById("docs-chrome");
        docsChrome.insertBefore(iframe, docsChrome.firstChild);

        var chatContainer = document.querySelector(".docs-chat-pane-container");
        if (chatContainer) {
            injectSlackBanner();
        } else {
            forEachChildNodeAdded(document.body, function(addedNode) {
                if (addedNode.className === "docs-chat-pane-container") {
                    return injectSlackBanner();
                }
            });
        }
    } else if (window.location.hostname === "superteamawesome.slack.com") {
        var clientUi = document.getElementById("client-ui");
        clientUi.insertBefore(iframe, clientUi.firstChild);
    } else {
        iframe.style.left = "0";
        iframe.style.position = "fixed";
        iframe.style.top = "0";
        document.documentElement.appendChild(iframe);

        // Shift the body down so that the toolbar doesn't obscure it
        document.body.style.transform = "translateY(" + toolbarHeight + ")";
    }
}

function monitorPresence() {
    document.addEventListener("visibilitychange", function() {
        chrome.runtime.sendMessage({
            msg: "pageVisibilityChange",
            isHidden: document.hidden
        });
    });

    var lastMouseMoveTimeMs = Date.now();
    document.addEventListener("mousemove", function() {
        lastMouseMoveTimeMs = Date.now();
    });

    var isIdle = false;
    setInterval(function() {
        // 3 minutes without mouse movement is considered idle.
        var isIdleNow = (Date.now() - lastMouseMoveTimeMs) > 3 * 60 * 1000;
        if (isIdleNow !== isIdle) {
            chrome.runtime.sendMessage({
                msg: "idleStatusChange",
                isIdle: isIdleNow
            });
            isIdle = isIdleNow;
        }
    }, 1000);
}

function injectChatWidget(chatWidgetState) {
    if (chatWidgetState === "closed") {
        removeChatWidget();
        return;
    }
    if (!document.getElementById("sta_chat")) {
        var iframe = document.createElement("iframe");
        iframe.id = "sta_chat";
        iframe.src = chrome.extension.getURL("chat/chat.html");
        iframe.style.border = "0";
        iframe.style.display = "block";
        iframe.style.right = "30px";
        iframe.style.position = "fixed";
        iframe.style.bottom = "0";
        iframe.style.width = "300px";
        iframe.style.zIndex = "99999"; // match .docs-chat-pane
        document.documentElement.appendChild(iframe);
    }
    const chatWidget = document.getElementById("sta_chat");
    if (chatWidgetState === "expanded") {
        chatWidget.style.height = "400px";
    } else {
        chatWidget.style.height = "30px";
    }
}

function removeChatWidget() {
    const chatWidget = document.getElementById("sta_chat");
    if (chatWidget) {
        chatWidget.parentNode.removeChild(chatWidget);
    }
}

function injectSlackBanner() {
    var docsChatPane = document.querySelector(".docs-chat-pane");
    var docsChatTitleBar = document.querySelector(".docs-chat-title-bar");
    if (docsChatPane && docsChatTitleBar) {
        var slackBanner = document.createElement("div");
        slackBanner.style.alignItems = "center";
        slackBanner.style.background = "#e62d41";
        slackBanner.style.color = "#fff";
        slackBanner.style.display = "flex";
        slackBanner.style.height = "20px";
        slackBanner.style.padding = "0 10px";
        docsChatPane.insertBefore(slackBanner, docsChatTitleBar.nextSibling);

        var slackLink = document.createElement("span");
        slackLink.innerHTML = "(open now)";
        slackLink.style.cursor = "pointer";
        slackLink.style.textDecoration = "underline";
        slackLink.addEventListener("click", function() {
            chrome.runtime.sendMessage({ msg: "openChatWidget" })
        });

        slackBanner.appendChild(document.createTextNode("Please use the Slack widget!"));
        slackBanner.innerHTML += "&nbsp;";
        slackBanner.appendChild(slackLink);
        return true;
    }
}

function forEachChildNodeAdded(node, callback) {
    var mutationObserver = new MutationObserver(function(records) {
        records.forEach(function(record) {
            for (var i = 0; i < record.addedNodes.length; ++i) {
                if (callback(record.addedNodes[i])) {
                    mutationObserver.disconnect();
                }
            }
        });
    });
    mutationObserver.observe(node, {
        childList: true
    });
}
