firebase.initializeApp(config.firebase);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.msg) {
        case "content_script_load":
            var hostname = request.location.hostname;
            if (hostname.match(/mit\.edu$/) ||
                hostname.match(/huntception\.com$/) ||
                hostname === "superteamawesome.slack.com" ||
                hostname === "docs.google.com") {
                sendResponse({ msg: "init_toolbar" });
            }
            break;
    }
});

firebase.auth().onAuthStateChanged(function(user) {
    console.log("Firebase logged in as:", user);
});
