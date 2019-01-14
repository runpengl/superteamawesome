import * as React from "react";
import * as ReactDOM from "react-dom";
import PopupLogin from "./PopupLogin";
import PuzzleList from "./PuzzleList";

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
                    if (p.parents != null && p.parents.length > 0) {
                        p.parents.forEach(function(parentKey) {
                            if (metaIndexByKey.hasOwnProperty(parentKey)) {
                                puzzleGroups[metaIndexByKey[parentKey]].push(p);
                            }
                        });
                        return;
                    } else if (p.parent) {
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
        popupData.currentUser
            ? React.createElement(Popup, popupData)
            : <PopupLogin />,
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

class AllPuzzles extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            searchInputValue: ""
        };
    }

    componentDidMount() {
        if (this.searchInputNode) {
            this.searchInputNode.focus();
        }
    }

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
                : [
                    this.renderSearchInput(),
                    this.renderPuzzles()
                ]
        );
    }

    renderSearchInput() {
        return r.div({ className: "AllPuzzles-search" },
            r.input({
                ref: n => this.searchInputNode = n, // autofocus
                className: "AllPuzzles-searchInput",
                placeholder: "Search Puzzles",
                value: this.state.searchInputValue,
                onChange: this.handleSearchInputChange.bind(this)
            })
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
                        puzzleViewers: this.props.puzzleViewers,
                        searchInputValue: this.state.searchInputValue
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
                        puzzleViewers: this.props.puzzleViewers,
                        searchInputValue: this.state.searchInputValue
                    });
                }, this);
        }
    }

    handleSearchInputChange(event) {
        this.setState({ searchInputValue: event.target.value });
    }
};

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
