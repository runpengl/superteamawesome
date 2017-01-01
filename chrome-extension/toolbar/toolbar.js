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
    ReactDOM.render(
        React.createElement(Toolbar, {puzzle: event.puzzle}),
        document.getElementById("toolbar")
    );
}

var r = React.DOM;
function Toolbar(props) {
    return r.div({ className: "Toolbar" },
        r.span({ className: "Toolbar-puzzleStatus " + props.puzzle.status },
            toHumanReadable(props.puzzle.status)),
        r.span({ className: "Toolbar-puzzleName" }, props.puzzle.name),
        r.a({
            className: "Toolbar-link",
            target: "_blank",
            href: "https://docs.google.com/spreadsheets/d/" + props.puzzle.spreadsheet_id
        }, "spreadsheet")
    );
}

function toHumanReadable(camelCaseStr) {
    return camelCaseStr.replace(/[A-Z]/g, " $1").toLowerCase();
}
