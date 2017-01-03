/**
 * Toolbar Data Flow
 *
 * - content_script.js: sendMessage("contentScriptLoad", window.location)
 *
 * - background.js: onMessage("contentScriptLoad", location, sendResponse)
 *   - if location matches puzzle, increment puzzleViewers/$puzzleKey/$userKey
 *   - if location matches hunt, save path to huntPages (unconfirmed)
 *   - in both cases, sendResponse("initToolbar"); otherwise do nothing
 *
 * - content_script.js: receive response; injectToolbar
 * - toolbar.js: connect("toolbarLoad")
 *
 * - background.js: onConnect("toolbarLoad", port)
 *   - listen to firebase updates and send them to the toolbar via port.postMessage
 *   - add disconnect listener to clean up firebase listeners
 *
 * - toolbar.js: port.onMessage(data); render with React
 */
// Ask the background script if we should inject a toolbar onto this page
chrome.runtime.sendMessage({
    msg: "contentScriptLoad",
    location: window.location,
    title: document.title
}, function(response) {
    if (!response) {
        return;
    }
    switch (response.msg) {
        case "initToolbar":
            injectToolbar();
            monitorPresence();
            break;
    }
});

function injectToolbar() {
    var toolbarHeight = "24px";

    // Set up iframe
    var iframe = document.createElement("iframe");
    iframe.src = chrome.extension.getURL("toolbar/toolbar.html");
    iframe.style.background = "#fff";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.height = toolbarHeight;
    iframe.style.width = "100vw";
    iframe.style.zIndex = "99999";

    // Some full-screen web-apps like google docs and slack don't respond well
    // to transform styles on the body, so we special-case their injection here.
    if (window.location.hostname === "docs.google.com") {
        var docsChrome = document.getElementById("docs-chrome");
        docsChrome.insertBefore(iframe, docsChrome.firstChild);
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
