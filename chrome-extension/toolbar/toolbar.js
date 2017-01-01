// Initialize a connection with the background script, which
// will cache data as long as this connection is open.
var port = chrome.runtime.connect({ name: "toolbarLoad" });
port.onMessage.addListener(function(event) {
    switch (event.msg) {
        case "initialData":
            handleInitialData(event);
    }
});

function handleInitialData(event) {
    console.log("found puzzle data", event.puzzle);
    document.getElementById("puzzle_name").textContent = event.puzzle.name;
}
