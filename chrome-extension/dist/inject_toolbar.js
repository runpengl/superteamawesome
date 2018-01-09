injectToolbar();

function injectToolbar() {
    if (document.body.__staToolbarInjected) {
        return;
    }
    var toolbarHeight = "24px";

    // Set up iframe
    var iframe = document.createElement("iframe");
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

        var chatContainer = document.getElementById("docs-chat-mole");
        if (chatContainer) {
            injectChatBanner(chatContainer);
        } else {
            forEachChildNodeAdded(document.body, function(addedNode) {
                if (addedNode.id === "docs-chat-mole") {
                    injectChatBanner(addedNode);
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
    document.body.__staToolbarInjected = true;

    monitorPresence();
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

/**
 * If the user tries to use google docs chat, let them—but also inject a banner
 * to tell them to use Slack, pretty please.
 */
function injectChatBanner(chatContainer) {
    if (document.getElementById("sta_toolbar_chat_banner")) {
        // Already injected
        return;
    }
    function maybeInjectBanner(node) {
        if (node.id && node.id.startsWith("gtn") &&
            node.className === "talk_chat_widget") {
            var slackPromptBanner = document.createElement("div");
            slackPromptBanner.id = "sta_toolbar_chat_banner";
            slackPromptBanner.style.background = "#e12548";
            slackPromptBanner.style.color = "#fff";
            slackPromptBanner.style.fontSize = "12px";
            slackPromptBanner.style.height = "20px";
            slackPromptBanner.style.lineHeight = "20px";
            slackPromptBanner.style.padding = "0 10px";
            slackPromptBanner.innerText = "Use the Slack channel, please!";
            node.insertBefore(
                slackPromptBanner,
                node.firstChild);
            return true;
        }
    }
    if (chatContainer.childNodes.length) {
        for (var i = 0; i < chatContainer.childNodes.length; ++i) {
            maybeInjectBanner(chatContainer.childNodes[i]);
        }
    } else {
        forEachChildNodeAdded(chatContainer, function(addedNode) {
            return maybeInjectBanner(addedNode);
        });
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
