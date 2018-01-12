import * as React from "react";
import * as ReactDOM from "react-dom";
import promptsList from "./promptList.js";

initApp();

var PUZZLE_STATUSES = ["new", "stuck", "inProgress", "solved"];

/**
 * initApp handles setting up the Firebase context and registering
 * callbacks for the auth status.
 */
function initApp() {
    var port = chrome.runtime.connect({ name: "dashboardLoad" });
    port.onMessage.addListener(function(event) {
        switch (event.msg) {
            case "auth":
                dashboardData = Object.assign({}, dashboardData, {
                    currentUser: event.user,
                    permissionDenied: false
                });
                return renderDashboard(dashboardData);

            case "slackConnectionStatus":
                dashboardData = Object.assign({}, dashboardData, {
                    slackConnectionStatus: event.status
                });
                return renderDashboard(dashboardData);

            case "permissionDenied":
                dashboardData = {
                    currentUser: dashboardData.currentUser,
                    permissionDenied: true
                };
                return renderDashboard(dashboardData);

            case "hunt":
                dashboardData = Object.assign({}, dashboardData, {
                    currentHunt: event.hunt
                });
                return renderDashboard(dashboardData);

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

                dashboardData = Object.assign({}, dashboardData, {
                    puzzles: event.puzzles,
                    puzzlesByStatus: puzzlesByStatus,
                    puzzleGroups: puzzleGroups
                });
                return renderDashboard(dashboardData);

            case "puzzleViewers":
                dashboardData = Object.assign({}, dashboardData, {
                    puzzleViewers: event.puzzleViewers
                });
                return renderDashboard(dashboardData);
        }
    });
}

var port = chrome.runtime.connect({ name: "dashboardLoad" });
port.onMessage.addListener(function(event) {
    console.log(event);
    switch (event.msg) {
        case "puzzles":
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
            ReactDOM.render(
                React.createElement(DashboardRounds, { puzzleGroups: puzzleGroups, huntDomain: event.huntDomain }),
                document.getElementById("puzzles")
            );
            break;
    }
});

//
// Rendering
// ----------------------------------------------------------------------------

var dashboardData = null;

function renderDashboard(dashboardData) {
    // console.log("dashboard data");
    // console.log(dashboardData)
    ReactDOM.render(
        React.createElement(Clock, null),
        document.getElementById("clock")
    );
    // console.log(promptsList);
    ReactDOM.render(
        React.createElement(BackronymPrompt, {prompts: promptsList}),
        document.getElementById("subheader")
    );
    // ReactDOM.render(
    //     React.createElement(DashboardRounds, { puzzleGroups: [], huntDomain: dashboardData.currentHunt.domain }),
    //     document.getElementById("puzzles")
    // );
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

class Clock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {date: new Date()};
    }

    componentDidMount() {
        this.timerID = setInterval(
            () => this.tick(),
            1000
        );
    }

    componentWillUnmount() {
        clearInterVal(this.timerID);
    }

    tick() {
        this.setState({
            date: new Date()
        });
    }

    render() {
        return (
            <div className="Clock">
                {this.state.date.toLocaleTimeString('en-US')}
            </div>
        );
    }

    leftPadZero(num) {
        return num < 10 ? "0" + num : num;
    }
}

class BackronymPrompt extends React.Component {
    constructor(props) {
        super(props);
        this.updatePrompt = this._updatePrompt.bind(this); // I don't know why I need this.
        this.state = {prompt: 'Super Tired Asians'};
    }

    componentDidMount() {
        setInterval(this.updatePrompt, 3000);
    }
    render() {
        return (
            <div className="Prompt">
                {this.state.prompt}
            </div>
        );
    }
    _updatePrompt() {
        var newPrompt = this.props.prompts.promptsList[Math.floor(Math.random() * this.props.prompts.promptsList.length)];
        this.setState({ prompt: newPrompt });
    }
}

class DashboardRounds extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        console.log(this.props);
        if (this.props.puzzleGroups.length == 0) {
            return (
                <div className="Dashboard-nopuzzles">
                    No puzzles unlocked yet!
                </div>
            );
        } else {
            return r.div(null,
                this.props.puzzleGroups.map(function(pg) {
                    if (pg[0].isMeta) {
                        return r.div({ className: "Dashboard-round" },
                            r.a({
                                className: "Dashboard-puzzle " + pg[0].status,
                                href: "http://" + pg[0].host + pg[0].path
                            }),
                            r.span({ className: "Dashboard-roundName" }, pg[0].name),
                            r.div({ className: "Dashboard-puzzles" },
                                pg.slice(1).map(function(puzzle) {
                                    return r.a({
                                        key: puzzle.key,
                                        className: "Dashboard-puzzle " + puzzle.status,
                                        href: "http://" + puzzle.host + puzzle.path})
                                })
                            )
                        )
                    } else {
                        return r.div({ className: "Dashboard-otherPuzzles" },
                            r.div({ className: "Dashboard-otherPuzzlesHeader" }, "Other Puzzles"),
                            pg.map(function(puzzle) {
                                return r.span({
                                    key: puzzle.key,
                                    className: "Dashboard-puzzle " + puzzle.status
                                }, puzzle.name);
                            })
                        );
                    }
                })
            );
        }
    }
}