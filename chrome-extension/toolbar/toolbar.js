// Initialize a connection with the background script, which
// will cache data as long as this connection is open.
var port = chrome.runtime.connect({ name: "toolbarLoad" });
port.onMessage.addListener(function(event) {
    switch (event.msg) {
        case "puzzle":
            handlePuzzleData(event.data);
        case "puzzleViewers":
            handlePuzzleViewers(event.data);
    }
});

var puzzleData = null;
function renderToolbar() {
    ReactDOM.render(
        React.createElement(Toolbar, puzzleData),
        document.getElementById("toolbar")
    );
}

function handlePuzzleData(data) {
    puzzleData = data;
    renderToolbar();
}

function handlePuzzleViewers(data) {
    puzzleData.viewers = data.viewers;
    renderToolbar();
}

var r = React.DOM;
function Toolbar(props) {
    return r.div({ className: "Toolbar" },
        r.div({ className: "Toolbar-puzzleStatus " + props.puzzle.status },
            toHumanReadable(props.puzzle.status)),
        r.div({ className: "Toolbar-puzzleName" }, props.puzzle.name),
        props.location === "puzzle" ? null : r.a({
            className: "Toolbar-link",
            target: "_blank",
            href: "http://" + props.hunt.domain + props.puzzle.path
        }, "puzzle"),
        props.location === "spreadsheet" ? null : r.a({
            className: "Toolbar-link",
            target: "_blank",
            href: "https://docs.google.com/spreadsheets/d/" + props.puzzle.spreadsheetId
        }, "spreadsheet"),

        r.div({ className: "Toolbar-right" },
            props.viewers && props.viewers.map(function(user) {
                return React.createElement(Avatar, {
                    key: user.uid,
                    displayName: user.displayName,
                    photoUrl: user.photoUrl
                });
            })
        )
    );
}

function Avatar(props) {
    return r.div({ className: "Avatar" },
        r.img({
            className: "Avatar-image",
            src: props.photoUrl
        }),
        r.div({
            className: "Avatar-tooltip"
        }, props.displayName)
    );
}

function toHumanReadable(camelCaseStr) {
    return camelCaseStr.replace(/([A-Z])/g, " $1").toLowerCase();
}
