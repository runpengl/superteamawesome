var puzzleData = null;
var puzzleViewers = null;

// Initialize a connection with the background script, which
// will cache data as long as this connection is open.
var port = chrome.runtime.connect({ name: "toolbarLoad" });
port.onMessage.addListener(function(event) {
    switch (event.msg) {
        case "puzzle":
            puzzleData = event.data;
            return renderToolbar();
        case "puzzleViewers":
            puzzleViewers = event.data.viewers;
            return renderToolbar();
    }
});

function renderToolbar() {
    ReactDOM.render(
        React.createElement(Toolbar, {
            currentUser: puzzleData.currentUser,
            location: puzzleData.location,
            hunt: puzzleData.hunt,
            puzzle: puzzleData.puzzle,
            viewers: puzzleViewers,
            onPuzzleStatusChange: handlePuzzleStatusChange
        }),
        document.getElementById("toolbar")
    );
}

function handlePuzzleStatusChange(newStatus) {
    chrome.runtime.sendMessage({
        msg: "puzzleStatusChange",
        status: newStatus
    });
}

var r = React.DOM;
function Toolbar(props) {
    return r.div({ className: "Toolbar" },
        React.createElement(PuzzleStatusPicker, {
            currentStatus: props.puzzle.status,
            onChange: props.onPuzzleStatusChange
        }),
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

var PUZZLE_STATUSES = ["new", "inProgress", "stuck", "solved"];
var PuzzleStatusPicker = React.createClass({
    displayName: "PuzzleStatusPicker",
    getInitialState: function() {
        return { isCollapsed: true, overrideStatusUpdate: null };
    },
    componentWillReceiveProps: function() {
        this.setState({ optimisticStatusUpdate: null });
    },
    render: function() {
        return r.div({
            className: "PuzzleStatusPicker" +
                (this.state.isCollapsed ? " isCollapsed" : "")
        },
            PUZZLE_STATUSES.map(function(status) {
                var currentStatus = this.state.optimisticStatusUpdate || this.props.currentStatus;
                return r.div({
                    key: status,
                    className: "PuzzleStatusPicker-statusButton " + status +
                        (currentStatus === status ? " isCurrent" : "") +
                        (this.state.optimisticStatusUpdate ? " isPending" : ""),
                    onClick: this.handleStatusClick.bind(this, status)
                }, this.toHumanReadable(status))
            }, this)
        );
    },
    toHumanReadable: function(statusStr) {
        return statusStr.replace(/([A-Z])/g, " $1").toLowerCase();
    },
    handleStatusClick: function(status, event) {
        if (this.state.isCollapsed) {
            this.setState({ isCollapsed: false });
            return;
        }
        if (status !== this.props.currentStatus) {
            this.setState({ optimisticStatusUpdate: status });
            this.props.onChange(status);
        }
        this.setState({ isCollapsed: true });
        event.preventDefault();
    }
});

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
