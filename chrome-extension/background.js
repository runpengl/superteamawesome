var currentFirebaseUser = null;

// Initialization
firebase.initializeApp(config.firebase);
firebase.auth().onAuthStateChanged(handleFirebaseAuthStateChange);
chrome.runtime.onMessage.addListener(handleChromeRuntimeMessage);

function noop() {}
// Keep this data synced for faster toolbar initialization
firebase.database().ref("chromeExtensionConfig").on("value", noop);
firebase.database().ref("hunts").on("value", noop);

function handleFirebaseAuthStateChange(user) {
    currentFirebaseUser = user;
}

/**
 * Handles chrome.runtime onMessage events. Typically these messages are
 * sent from the content script injected on each page.
 */
function handleChromeRuntimeMessage(request, sender, sendResponse) {
    switch (request.msg) {
        case "content_script_load":
            return handleContentScriptLoadMessage(request.location, sendResponse);
    }
};

/**
 * Handles the `content_script_load` message. Given the location data
 * sent by the content script, determines if a toolbar should be injected
 * onto the page.
 */
function handleContentScriptLoadMessage(location, sendResponse) {
    var alreadySent = false;
    function maybeInitToolbar() {
        if (alreadySent) return;
        sendResponse({ msg: "init_toolbar" });
        alreadySent = true;
    }
    firebase.database().ref("chromeExtensionConfig/toolbarFilters")
        .once("value", function(filters) {
            var hostname = location.hostname;
            var pathname = location.pathname;
            filters.forEach(function(filter) {
                var hostSuffixFilter = filter.val().hostSuffix;
                var pathPrefixFilter = filter.val().pathPrefix;
                var satisfiesHostFilter = !hostSuffixFilter || hostname.endsWith(hostSuffixFilter);
                var satisfiesPathFilter = !pathPrefixFilter || pathname.startsWith(pathPrefixFilter);
                if (satisfiesHostFilter && satisfiesPathFilter) {
                    maybeInitToolbar();
                }
            });
        });
    firebase.database().ref("hunts")
        .once("value", function(hunts) {
            var hostname = location.hostname;
            hunts.forEach(function(hunt) {
                var huntDomain = hunt.val().domain;
                if (huntDomain && hostname.endsWith(huntDomain)) {
                    maybeInitToolbar();
                }
            });
        });

    // sendResponse will be called asynchronously
    return true;
}
