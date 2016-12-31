firebase.initializeApp(config.firebase);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.msg) {
        case "content_script_load":
            if (request.location.hostname.match(/mit\.edu$/)) {
                sendResponse({ msg: "init_toolbar" });
            }
            break;
    }
});

firebase.auth().onAuthStateChanged(function(user) {
    console.log("Firebase logged in as:", user);
});
