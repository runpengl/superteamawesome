injectToolbar();
monitorPresence();

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.msg) {
        case "injectChatWidget":
            injectChatWidget();
            break;
        case "removeChatWidget":
            removeChatWidget();
            break;
        case "toggleChatWidget":
            toggleChatWidget();
            break;
    }
});

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

        var chatContainer = document.querySelector(".docs-chat-pane-container");
        if (chatContainer) {
            injectSidebar(chatContainer);
        } else {
            forEachChildNodeAdded(document.body, function(addedNode) {
                if (addedNode.className === "docs-chat-pane-container") {
                    injectSidebar(addedNode);
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
 * Instead of google docs chat, inject a Slack widget into the sidebar.
 */
function injectSidebar(chatContainer) {
    if (document.getElementById("sta_sidebar")) {
        // Already injected
        return;
    }

    var iframe = document.createElement("iframe");
    iframe.id = "sta_sidebar";
    iframe.src = chrome.extension.getURL("sidebar/sidebar.html");
    iframe.style.background = "#fff";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.height = "100%";
    iframe.style.position = "absolute";
    iframe.style.top = "0";
    iframe.style.width = "300px";
    iframe.style.zIndex = "801"; // match .docs-chat-pane
    chatContainer.appendChild(iframe);
}

function injectChatWidget() {
    if (document.getElementById("sta_sidebar") || document.getElementById("sta_chat")) {
        // Already injected
        return;
    }

    var iframe = document.createElement("iframe");
    iframe.id = "sta_chat";
    iframe.src = chrome.extension.getURL("sidebar/sidebar.html");
    iframe.style.background = "#fff";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.height = "400px";
    iframe.style.right = "30px";
    iframe.style.position = "fixed";
    iframe.style.bottom = "0";
    iframe.style.width = "300px";
    iframe.style.zIndex = "99999"; // match .docs-chat-pane
    document.documentElement.appendChild(iframe);
}

function removeChatWidget() {
    const chatWidget = document.getElementById("sta_chat");
    if (chatWidget) {
        chatWidget.parentNode.removeChild(chatWidget);
    }
}

function toggleChatWidget() {
    const chatWidget = document.getElementById("sta_chat");
    if (chatWidget) {
        if (chatWidget.hasAttribute("data-sta-collapsed")) {
            chatWidget.removeAttribute("data-sta-collapsed");
            chatWidget.style.height = "400px";
        } else {
            chatWidget.setAttribute("data-sta-collapsed", true);
            chatWidget.style.height = "30px";
        }
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
