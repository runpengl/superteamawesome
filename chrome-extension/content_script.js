// Ask the background script if we should inject a toolbar onto this page
chrome.runtime.sendMessage({
    msg: "contentScriptLoad",
    location: window.location
}, function(response) {
    if (!response) {
        return;
    }
    switch (response.msg) {
        case "initToolbar":
            injectToolbar();
            break;
    }
});

function injectToolbar() {
    var toolbarHeight = "30px";

    // Set up iframe
    var iframe = document.createElement("iframe");
    iframe.src = chrome.extension.getURL("toolbar/toolbar.html");
    iframe.style.background = "#fff";
    iframe.style.border = "0";
    iframe.style.height = toolbarHeight;
    iframe.style.left = "0";
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.width = "100vw";
    iframe.style.zIndex = "99999";
    document.documentElement.appendChild(iframe);

    // Shift the body down so that the toolbar doesn't obscure it
    document.body.style.transform = "translateY(" + toolbarHeight + ")";
}
