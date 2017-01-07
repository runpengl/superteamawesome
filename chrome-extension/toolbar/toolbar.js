var toolbarType = null;
var toolbarData = null;

var port;
function refreshConnection() {
    if (port) {
        port.disconnect();
    }
    // Initialize a connection with the background script, which
    // will continue to send data as long as this connection is open.
    port = chrome.runtime.connect({ name: "toolbarLoad" });
    port.onMessage.addListener(function(event) {
        switch (event.msg) {
            case "hunt":
                toolbarType = "hunt";
                toolbarData = event.data;
                return renderToolbar();
            case "puzzle":
                toolbarType = "puzzle";
                toolbarData = Object.assign({}, toolbarData, event.data);
                return renderToolbar();
            case "puzzleViewers":
                toolbarType = "puzzle";
                toolbarData = Object.assign({}, toolbarData, {
                    viewers: event.data.viewers
                });
                return renderToolbar();
            case "slackChannel":
                toolbarData = Object.assign({}, toolbarData, {
                    slackChannel: event.data.channel
                });
                if (toolbarType !== "none") {
                    renderToolbar();
                }
                break;
            default:
                toolbarType = null;
                toolbarData = null;
                renderToolbar();
        }
    });
    port.onDisconnect.addListener(function() {
        refreshConnection();
    });
}

refreshConnection();
chrome.runtime.onMessage.addListener(function(request) {
    if (request.msg === "refreshConnection") {
        toolbarType = "none";
        refreshConnection();
    }
});

function renderToolbar() {
    switch (toolbarType) {
        case "hunt":
            ReactDOM.render(
                React.createElement(HuntToolbar, toolbarData),
                document.getElementById("toolbar")
            );
            break;
        case "puzzle":
            ReactDOM.render(
                React.createElement(PuzzleToolbar, Object.assign({}, toolbarData, {
                    onPuzzleStatusChange: handlePuzzleStatusChange
                })),
                document.getElementById("toolbar")
            );
            break;
        default:
            ReactDOM.render(
                React.createElement(BasicToolbar),
                document.getElementById("toolbar")
            )
    }
}

function BasicToolbar(props) {
    return r.div({ className: "Toolbar" },
        r.img({ className: "Toolbar-loadingIndicator", src: "../ripple.svg" }),
        "SuperTeamAwesome Puzzle Tool"
    )
}

function HuntToolbar(props) {
    return r.div({ className: "Toolbar" },
        r.img({ className: "Toolbar-loadingIndicator", src: "../ripple.svg" }),
        "Current Hunt: ",
        r.div({ className: "Toolbar-huntName" }, props.hunt.name),
        r.a({
            className: "Toolbar-link",
            target: "_blank",
            href: "https://superteamawesome.slack.com/"
        }, "slack"),
        r.div({ className: "Toolbar-right" },
            r.span({ className: "Toolbar-currentUserName" },
                props.currentUser.displayName),
            React.createElement(Avatar, {
                photoUrl: props.currentUser.photoURL,
                isInvisible: false,
                isIdle: false
            })
        )
    );
}

function handlePuzzleStatusChange(newStatus) {
    chrome.runtime.sendMessage({
        msg: "puzzleStatusChange",
        status: newStatus
    });
}

var r = React.DOM;
function PuzzleToolbar(props) {
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
        props.location === "slack" ? null : r.div({ className: "Toolbar-slackInfo" },
            r.a({
                className: "Toolbar-link",
                target: "_blank",
                href: "https://superteamawesome.slack.com/messages/" + props.puzzle.slackChannel,
                onClick: function() {
                    if (props.slackChannel && !props.slackChannel.is_member) {
                        chrome.runtime.sendMessage({
                            msg: "joinChannel",
                            name: props.puzzle.slackChannel
                        });
                    }
                }
            }, "slack"),
            props.puzzle.status === "solved" || !props.slackChannel || props.slackChannel.is_member
                ? null
                : r.div({ className: "Toolbar-linkTooltip" },
                    "Working on this puzzle? Join the Slack channel."
                ),
            props.slackChannel && props.slackChannel.unread_count_display > 0
                ? r.span({ className: "Toolbar-slackUnreadCount" },
                    props.slackChannel.unread_count_display
                )
                : null
        ),

        React.createElement(React.addons.CSSTransitionGroup, {
            className: "Toolbar-right",
            transitionName: "Avatar",
            transitionEnterTimeout: 500,
            transitionLeaveTimeout: 300
        },
            props.viewers && props.viewers.map(function(user) {
                return React.createElement(Avatar, {
                    key: user.id,
                    displayName: user.displayName,
                    photoUrl: user.photoUrl,
                    isIdle: user.isIdle,
                    isInvisible: !user.isPuzzleVisible
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
    return r.div({
        className: "Avatar" +
            (props.isInvisible ? " isInvisible" : "") +
            (props.isIdle ? " isIdle" : "")
    },
        r.div({ className: "Avatar-imageFrame" },
            r.img({
                className: "Avatar-image",
                src: props.photoUrl
            })
        ),
        r.div({ className: "Avatar-tooltip" },
            props.displayName,
            props.isIdle
                ? " (idle)"
                : (props.isInvisible ? " (tab hidden)" : "")
        )
    );
}
