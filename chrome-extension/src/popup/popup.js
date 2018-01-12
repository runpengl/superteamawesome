import * as React from "react";
import * as ReactDOM from "react-dom";

initApp();

var PUZZLE_STATUSES = ["new", "stuck", "inProgress", "solved"];

/**
 * initApp handles setting up the Firebase context and registering
 * callbacks for the auth status.
 */
function initApp() {
    var port = chrome.runtime.connect({ name: "popupLoad" });
    port.onMessage.addListener(function(event) {
        switch (event.msg) {
            case "auth":
                popupData = Object.assign({}, popupData, {
                    currentUser: event.user,
                    permissionDenied: false
                });
                return renderPopup();

            case "slackConnectionStatus":
                popupData = Object.assign({}, popupData, {
                    slackConnectionStatus: event.status
                });
                return renderPopup();

            case "permissionDenied":
                popupData = {
                    currentUser: popupData.currentUser,
                    permissionDenied: true
                };
                return renderPopup();

            case "hunt":
                popupData = Object.assign({}, popupData, {
                    currentHunt: event.hunt
                });
                return renderPopup();

            case "puzzles":
                var puzzlesByStatus = {
                    "new": [],
                    inProgress: [],
                    stuck: [],
                    solved: []
                };
                event.puzzles.forEach(function(puzzle) {
                    puzzlesByStatus[puzzle.status].push(puzzle);
                });

                // Group by meta puzzles; ungrouped puzzles at the end
                var puzzleGroups = event.puzzles
                    .filter(function(p) { return p.isMeta; })
                    .map(function(mp) { return [mp]; });
                var otherPuzzles = [];
                var metaIndexByKey = {};
                puzzleGroups.forEach(function(pg, i) {
                    metaIndexByKey[pg[0].key] = i;
                });
                event.puzzles.forEach(function(p) {
                    if (p.parent) {
                        if (metaIndexByKey.hasOwnProperty(p.parent)) {
                            puzzleGroups[metaIndexByKey[p.parent]].push(p);
                            return;
                        }
                    }
                    if (!p.isMeta) {
                        otherPuzzles.push(p);
                    }
                });
                if (otherPuzzles.length) {
                    puzzleGroups.push(otherPuzzles);
                }

                popupData = Object.assign({}, popupData, {
                    puzzles: event.puzzles,
                    puzzlesByStatus: puzzlesByStatus,
                    puzzleGroups: puzzleGroups
                });
                return renderPopup();

            case "puzzleViewers":
                popupData = Object.assign({}, popupData, {
                    puzzleViewers: event.puzzleViewers
                });
                return renderPopup();
        }
    });
}

//
// Rendering
// ----------------------------------------------------------------------------

var popupData = null;
function renderPopup() {
    ReactDOM.render(
        React.createElement(
            popupData.currentUser ? Popup : PopupLogin, popupData),
        document.getElementById("popup")
    );
}

var r = {};
[
    "a",
    "canvas",
    "circle",
    "div",
    "g",
    "img",
    "input",
    "li",
    "path",
    "span",
    "strong",
    "svg",
    "ul"
].map(function(type) { r[type] = React.createFactory(type); });

class Popup extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sortBy: "rounds"
        };
    }

    render() {
        var props = this.props;
        return r.div({ className: "Popup" },
            r.div({ className: "Popup-toolbar" },
                r.img({
                    className: "Popup-userImage",
                    src: props.currentUser.photoURL
                }),
                r.div({ className: "Popup-userName" }, props.currentUser.displayName),
                r.div({
                    className: "Popup-signOutButton",
                    onClick: function() {
                        chrome.runtime.sendMessage({ msg: "signOut" });
                    }
                }, "Sign out")
            ),
            props.slackConnectionStatus === "error"
                ? r.div({
                    className: "Popup-slackConnectionErrorBanner",
                    onClick: function() {
                        chrome.runtime.sendMessage({ msg: "authorizeSlack" });
                    }
                }, "Couldn't connect to Slack. Try again?")
                : null,
            r.div({ className: "Popup-contents" },
                props.currentHunt
                    ? r.div({ className: "Popup-currentHuntInfo" },
                        "Current Hunt: ", r.a({
                            href: "http://" + props.currentHunt.domain,
                            onClick: function(event) {
                                if (event.shiftKey || event.metaKey) {
                                    return;
                                }
                                chrome.tabs.update({ url: "http://" + props.currentHunt.domain });
                            }
                        }, r.strong(null, props.currentHunt.name)),
                        props.puzzles
                            ? r.div(null,
                                "Puzzles Solved: ",
                                r.strong(null,
                                    props.puzzlesByStatus.solved.length,
                                    "/", props.puzzles.length
                                ),
                                " (",
                                r.a({
                                    href: chrome.extension.getURL("dashboard/dashboard.html"),
                                    onClick: function() {
                                        chrome.tabs.create({
                                            url: chrome.extension.getURL("dashboard/dashboard.html")
                                        });
                                    }
                                }, "Dashboard"),
                                ")"
                            )
                            : null,
                        r.div({
                            className: "Popup-sortToggle",
                            onClick: this.handleSortToggleClick.bind(this)
                        },
                            this.state.sortBy,
                            React.createElement(SortIcon, {
                                className: "Popup-sortIcon"
                            })
                        )
                    )
                    : (!props.permissionDenied ? null : [
                        React.createElement(KeyIcon, {
                            key: "keyIcon",
                            className: "Popup-permissionDeniedIcon"
                        }),
                        r.div({
                            key: "pdPrompt",
                            className: "Popup-permissionDeniedPrompt"
                        }, "Please ask an admin for access to this tool!")
                    ]),
                props.currentHunt && props.puzzles
                    ? React.createElement(AllPuzzles, {
                        huntDomain: props.currentHunt.domain,
                        puzzles: props.puzzles,
                        sortBy: this.state.sortBy,
                        puzzleGroups: props.puzzleGroups,
                        puzzlesByStatus: props.puzzlesByStatus,
                        puzzleViewers: props.puzzleViewers
                    })
                    : null
            )
        );
    }

    handleSortToggleClick() {
        switch (this.state.sortBy) {
            case "rounds":
                this.setState({ sortBy: "status" });
                break;
            case "status":
                this.setState({ sortBy: "rounds" });
                break;
        }
    }
}

class PopupLogin extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isSigningIn: false
        };
    }

    componentDidMount() {
        var me = this;
        var context = me.refs.canvas.getContext("2d");
        var w = 0, h = 0, cx = 0, cy = 0;
        var d = Date.now();
        window.addEventListener("resize", resizeCanvas);
        function resizeCanvas() {
            if (me.refs.canvas) {
                me.refs.canvas.width = window.innerWidth;
                me.refs.canvas.height = window.innerHeight;
            } else {
                window.removeEventListener("resize", resizeCanvas);
            }
        }
        resizeCanvas();
        function drawDiamond(ox, oy, w, h, c) {
            w = w || 100;
            h = h || 200;
            context.beginPath();
            context.moveTo(ox, oy);
            context.lineTo(ox + w / 2, oy + h / 2);
            context.lineTo(ox, oy + h);
            context.lineTo(ox - w / 2, oy + h / 2);
            context.closePath();
            context.lineWidth = 0;
            context.fillStyle = c;
            context.fill();
        }
        function drawBackground(elapsedTime) {
            if (!me.refs.canvas) {
                return;
            }
            var DIA_WIDTH = 100;
            var DIA_HEIGHT = 190;
            var rA = 254, rB = 210;
            var gA = 255, gB = 220;
            var bA = 255, bB = 205;
            w = me.refs.canvas.width;
            h = me.refs.canvas.height;
            cx = Math.ceil(w / DIA_WIDTH) + 1;
            cy = Math.ceil(h / (DIA_HEIGHT / 2)) + 1;
            var rOffset = 0, gOffset = 0, bOffset = 0;
            for (var j = 0; j < cy; ++j) {
                for (var i = 0; i < cx; ++i) {
                    rOffset = Math.round(((rB - rA) / cx) * i) + Math.floor(Math.sin(elapsedTime/1000 - i * 0.8) * 20);
                    gOffset = Math.round(((gB - gA) / cy) * j);
                    bOffset = Math.round(((bB - bA) / cx) * j);
                    drawDiamond(i * DIA_WIDTH + (j % 2) * (DIA_WIDTH / 2), j * (DIA_HEIGHT / 2) - DIA_HEIGHT / 2, DIA_WIDTH + 1, DIA_HEIGHT + 1, "rgb(" + (rA + rOffset) + ", " + (gA + gOffset) + ", " + (bA + bOffset) + ")");
                }
            }
            window.requestAnimationFrame(drawBackground);
        }
        drawBackground(0);
    }

    componentWillReceiveProps() {
        this.setState({ isSigningIn: false });
    }

    render() {
        var me = this;
        return r.div({ className: "PopupLogin" },
            r.canvas({ ref: "canvas", className: "PopupLogin-background" }),
            r.div({
                className: "PopupLogin-image",
                style: {
                    backgroundPosition: -(Math.floor(Math.random() * 8) * 200) + "px"
                }
            }),
            r.div({ className: "PopupLogin-title" },
                "super team awesome toolbar"),
            this.state.isSigningIn
                ? r.img({ className: "PopupLogin-loading", src: "../ripple.svg" })
                : r.div({
                    className: "PopupLogin-button",
                    onClick: function() {
                        chrome.runtime.sendMessage({ msg: "signIn" });
                        me.setState({ isSigningIn: true });
                    }
                }, "Sign in with Google")
        );
    }
}

class AllPuzzles extends React.Component {
    render() {
        return r.div({ className: "AllPuzzles" },
            this.props.puzzles.length === 0
                ? [
                    r.div({ className: "AllPuzzles-emptyImage" }),
                    r.div({
                        key: "emptyMsg",
                        className: "AllPuzzles-empty"
                    }, "No puzzles yet. Check back later!")
                ]
                : this.renderPuzzles()
        );
    }

    renderPuzzles() {
        switch (this.props.sortBy) {
            case "rounds":
                return this.props.puzzleGroups.map(function(pg) {
                    return React.createElement(PuzzleList, {
                        key: pg[0].isMeta ? pg[0].key : "other",
                        groupName: pg[0].isMeta ? pg[0].name : "Other Puzzles",
                        groupType: "round",
                        huntDomain: this.props.huntDomain,
                        puzzles: pg,
                        puzzleViewers: this.props.puzzleViewers
                    });
                }, this);
            case "status":
                return PUZZLE_STATUSES.map(function(status) {
                    var puzzles = this.props.puzzlesByStatus[status];
                    if (puzzles.length === 0) {
                        return;
                    }
                    var readableStatus = status.replace(/([A-Z])/g, " $1");
                    return React.createElement(PuzzleList, {
                        key: status,
                        groupName: readableStatus.charAt(0).toUpperCase() + readableStatus.slice(1),
                        groupType: "status",
                        huntDomain: this.props.huntDomain,
                        puzzles: puzzles,
                        puzzleViewers: this.props.puzzleViewers
                    });
                }, this);
        }
    }
};

class PuzzleList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isCollapsed: false
        };
    }

    render() {
        var props = this.props;
        return r.div({
            className: "PuzzleList" + (this.state.isCollapsed ? " isCollapsed" : "")
        },
            r.div({
                className: "PuzzleList-groupHeader",
                onClick: this.handleHeaderClick.bind(this)
            },
                props.groupName,
                this.props.groupType === "round"
                    ? r.span({ className: "PuzzleList-numSolved" },
                        props.puzzles.filter(function(p) {
                            return p.status === "solved"
                        }).length,
                        "/",
                        props.puzzles.length
                    )
                    : null
            ),
            this.renderPuzzles()
        );
    }

    renderPuzzles() {
        var props = this.props;
        return r.ul({ className: "PuzzleList-list" },
            props.puzzles.map(function(puzzle, i) {
                var numActiveViewers = props.puzzleViewers &&
                    props.puzzleViewers[puzzle.key];

                return r.li({ key: puzzle.key },
                    r.a({
                        className: "PuzzleList-puzzle " + puzzle.status,
                        href: "http://" + props.huntDomain + puzzle.path,
                        onClick: function(event) {
                            if (event.shiftKey || event.metaKey) {
                                return;
                            }
                            chrome.tabs.update({
                                url: "http://" + props.huntDomain + puzzle.path
                            });
                        }
                    },
                        r.div({ className: "PuzzleList-puzzleLabel" },
                            r.span({ className: "PuzzleList-puzzleName" },
                                puzzle.name),
                            (props.groupType === "round" && i === 0 && puzzle.isMeta) ||
                            (props.groupType === "status" && puzzle.isMeta)
                                ? r.span({ className: "PuzzleList-metaBadge" }, "Meta")
                                : null
                        ),
                        r.div({ className: "PuzzleList-puzzleMetadata" },
                            numActiveViewers
                                ? r.div({
                                    className: "PuzzleList-puzzleViewerCount"
                                },
                                    React.createElement(PersonIcon),
                                    numActiveViewers
                                )
                                : null,
                            puzzle.status === "solved"
                                ? r.span({
                                    className: "PuzzleList-puzzleSolution"
                                }, puzzle.solution)
                                : null
                        )
                    )
                );
            })
        );
    }

    handleHeaderClick() {
        this.setState({ isCollapsed: !this.state.isCollapsed });
    }
}

function KeyIcon(props) {
    return r.svg({
        className: "KeyIcon" + (props.className ? " " + props.className : ""),
        viewBox: "0 0 24 24"
    },
        r.path({
            d: "M14.5,4C11.5,4,9,6.5,9,9.5c0,1,0.3,1.9,0.7,2.8L4,18v2h4v-2h2v-2h2l1.2-1.2c0.4,0.1,0.9,0.2,1.3,0.2c3,0,5.5-2.5,5.5-5.5  S17.5,4,14.5,4z M16,9c-0.8,0-1.5-0.7-1.5-1.5S15.2,6,16,6c0.8,0,1.5,0.7,1.5,1.5S16.8,9,16,9z"
        })
    );
}

function PersonIcon() {
    return r.svg({ className: "PersonIcon", viewBox: "0 0 24 24" },
        r.circle({ cx: 12, cy: 8, r: 4 }),
        r.path({
            d: "M12,14c-6.1,0-8,4-8,4v2h16v-2C20,18,18.1,14,12,14z"
        })
    );
}

function SortIcon(props) {
    return r.svg({
        className: "SortIcon" + (props.className ? " " + props.className : ""),
        viewBox: "0 -256 1792 1792"
    },
        r.g({ transform: "matrix(1,0,0,-1,387.25424,1293.0169)" },
            r.path({
                d: "m 1024,448 q 0,-26 -19,-45 L 557,-45 q -19,-19 -45,-19 -26,0 -45,19 L 19,403 q -19,19 -19,45 0,26 19,45 19,19 45,19 h 896 q 26,0 45,-19 19,-19 19,-45 z m 0,384 q 0,-26 -19,-45 -19,-19 -45,-19 H 64 q -26,0 -45,19 -19,19 -19,45 0,26 19,45 l 448,448 q 19,19 45,19 26,0 45,-19 l 448,-448 q 19,-19 19,-45 z"
            })
        )
    );
}
