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
