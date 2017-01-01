// Initialize a connection with the background script, which
// will cache data as long as this connection is open.
var port = chrome.runtime.connect({ name: "toolbarLoad" });
port.onMessage.addListener(function(event) {
    switch (event.msg) {
        case "puzzle":
            handlePuzzleData(event.data);
    }
});

function handlePuzzleData(data) {
    ReactDOM.render(
        React.createElement(Toolbar, data),
        document.getElementById("toolbar")
    );
}

var r = React.DOM;
function Toolbar(props) {
    return r.div({ className: "Toolbar" },
        r.div({ className: "Toolbar-puzzleStatus " + props.puzzle.status },
            toHumanReadable(props.puzzle.status)),
        r.div({ className: "Toolbar-puzzleName" }, props.puzzle.name),
        r.a({
            className: "Toolbar-link",
            target: "_blank",
            href: "http://" + props.hunt.domain + props.puzzle.path
        }, "puzzle"),
        r.a({
            className: "Toolbar-link",
            target: "_blank",
            href: "https://docs.google.com/spreadsheets/d/" + props.puzzle.spreadsheetId
        }, "spreadsheet"),

        r.div({ className: "Toolbar-right" },
            r.span({ className: "Toolbar-userName" }, props.currentUser.displayName),
            r.img({
                className: "Toolbar-userImage",
                src: props.currentUser.photoURL
            })
        )
    );
}

function toHumanReadable(camelCaseStr) {
    return camelCaseStr.replace(/([A-Z])/g, " $1").toLowerCase();
}
