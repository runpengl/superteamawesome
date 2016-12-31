firebase.initializeApp(config.firebase);

function onBeforeNavigate(details) {
    console.log("onBeforeNavigate:", details.tabId, details.url);
}

chrome.webNavigation.onBeforeNavigate.addListener(
    onBeforeNavigate, {
        url: [{ hostSuffix: "mit.edu" }]
    });

firebase.auth().onAuthStateChanged(function(user) {
    console.log("Firebase logged in as:", user);
});
