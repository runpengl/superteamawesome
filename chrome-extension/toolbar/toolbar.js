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
            case "discoveredPage":
                toolbarData = Object.assign({}, toolbarData, {
                    discoveredPage: event.data
                });
                return renderToolbar();
            default:
                toolbarType = null;
                toolbarData = null;
                renderToolbar();
        }
    });
    port.onDisconnect.addListener(function() {
        port = null;
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
                React.createElement(PuzzleToolbar, toolbarData),
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
        props.hunt.isCurrent ? "Current " : null,
        "Hunt: ",
        r.div({ className: "Toolbar-huntName" }, props.hunt.name),
        props.discoveredPage && !props.discoveredPage.ignored
            ? r.div({ className: "Toolbar-linkTooltip" }, "Waiting for an admin to create puzzles…")
            : null,
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

var r = React.DOM;
function PuzzleToolbar(props) {
    return r.div({ className: "Toolbar" },
        React.createElement(PuzzleStatusPicker, {
            puzzle: props.puzzle
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
        props.location === "slack"
            ? r.a({
                className: "Toolbar-link",
                href: "slack://channel?team=T03A0NUTH&id=" + props.puzzle.slackChannelId
            }, "open in app")
            : r.div({ className: "Toolbar-slackInfo" },
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
        return {
            isCollapsed: true,
            optimisticStatusUpdate: null,
            solutionText: null
        };
    },
    componentWillReceiveProps: function(nextProps) {
        if (// Looking at the same puzzle
            this.props.puzzle.key === nextProps.puzzle.key &&
            // The puzzle was changed to solved
            this.props.puzzle.status !== "solved" &&
            nextProps.puzzle.status === "solved" &&
            // *This* client set the puzzle to solved
            this.state.optimisticStatusUpdate === "solved") {
            this.setState({ solutionText: nextProps.puzzle.solution || "" });
        }
        this.setState({
            optimisticSolution: null,
            optimisticStatusUpdate: null
        });
    },
    componentDidUpdate: function(prevProps, prevState) {
        if (prevState.solutionText === null &&
            this.state.solutionText !== null) {
            this.refs.solutionInput.focus();
        }
    },
    render: function() {
        var displaySolution = this.state.optimisticSolution
            || this.props.puzzle.solution
            || "(no solution)";
        return r.div({
            className: "PuzzleStatusPicker" +
                (this.state.isCollapsed ? " isCollapsed" : "")
        },
            PUZZLE_STATUSES.map(function(status) {
                var currentStatus = this.state.optimisticStatusUpdate ||
                    this.props.puzzle.status;
                return r.div({
                    key: status,
                    className: "PuzzleStatusPicker-statusButton " + status +
                        (currentStatus === status ? " isCurrent" : "") +
                        (this.state.optimisticStatusUpdate ? " isPending" : ""),
                    onClick: this.handleStatusClick.bind(this, status)
                }, this.toHumanReadable(status))
            }, this),
            this.props.puzzle.status === "solved"
                ? r.div({ className: "PuzzleStatusPicker-solution" },
                    this.state.solutionText === null
                        ? r.div({
                            className: "PuzzleStatusPicker-solutionButton",
                            onClick: this.handleSolutionClick
                        }, displaySolution)
                        : r.input({
                            ref: "solutionInput",
                            className: "PuzzleStatusPicker-solutionInput",
                            value: this.state.solutionText,
                            placeholder: "SOLUTION",
                            onBlur: this.submitSolution,
                            onChange: this.handleSolutionChange,
                            onKeyDown: this.handleSolutionInputKeyDown
                        })
                )
                : null
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
        if (status !== this.props.puzzle.status) {
            this.setState({ optimisticStatusUpdate: status });
            chrome.runtime.sendMessage({
                msg: "puzzleStatusChange",
                status: status
            });
        }
        this.setState({ isCollapsed: true });
        event.preventDefault();
    },
    handleSolutionClick: function() {
        this.setState({ solutionText: this.props.puzzle.solution });
    },
    handleSolutionChange: function(event) {
        this.setState({ solutionText: event.target.value });
    },
    submitSolution: function() {
        chrome.runtime.sendMessage({
            msg: "puzzleSolutionChange",
            solution: this.state.solutionText.toUppercase()
        });
        this.setState({
            optimisticSolution: this.state.solutionText,
            solutionText: null
        });
    },
    handleSolutionInputKeyDown: function(event) {
        if (event.key === "Enter") {
            this.submitSolution();
        }
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
