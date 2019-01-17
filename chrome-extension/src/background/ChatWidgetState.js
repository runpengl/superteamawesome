// "closed" | "collapsed" | "expanded"
let _state = "expanded";

export function state() {
    return _state;
}

export function setState(state) {
    _state = state;
}

export function open(tabId) {
    setState("expanded");
    chrome.tabs.sendMessage(tabId, {
        msg: "injectChatWidget",
        chatWidgetState: "expanded"
    });
}

export function toggle(tabId) {
    setState(
        state() === "closed" ||
        state() === "collapsed"
            ? "expanded"
            : "collapsed"
    );
    chrome.tabs.sendMessage(tabId, {
        msg: "injectChatWidget",
        chatWidgetState: state()
    });
}
