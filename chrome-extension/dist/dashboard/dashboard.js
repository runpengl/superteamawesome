import * as React from "react";
import * as ReactDOM from "react-dom";


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

window.onload = function() {
    ReactDOM.render(
        React.createElement(Clock),
        document.getElementById("clock")
    );
    ReactDOM.render(
        React.createElement(StaPrompt, {prompts: prompts}),
        document.getElementById("subheader")
    );
};

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
                React.createElement(DashboardRounds, { puzzleGroups: puzzleGroups }),
                document.getElementById("puzzles")
            );
            break;
    }
});

var r = React.DOM;
function DashboardRounds(props) {
    if (props.puzzleGroups.length == 0) {
        return r.div({className: "Dashboard-nopuzzles"}, "No puzzles unlocked yet!");
    }
    return r.div(null,
        props.puzzleGroups.map(function(pg) {
            if (pg[0].isMeta) {
                return r.div({ className: "Dashboard-round" },
                    r.span({
                        className: "Dashboard-puzzle " + pg[0].status
                    }, pg[0].name),
                    r.span({ className: "Dashboard-roundName" }, pg[0].name),
                    r.div({ className: "Dashboard-puzzles" },
                        pg.slice(1).map(function(puzzle) {
                            return r.span({
                                key: puzzle.key,
                                className: "Dashboard-puzzle " + puzzle.status
                            }, puzzle.name)
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

var Clock = React.createClass({
    displayName: "Clock",
    getInitialState: function() {
        return { now: Date.now() };
    },
    componentDidMount: function() {
        setInterval(this.updateTime, 500);
    },
    componentWillUnmount: function() {
        setInterval(this.updateTime, 500);
    },
    render: function() {
        var date = new Date(this.state.now);
        var hours = date.getHours();

        return r.div({ className: "Clock" },
            (hours - 1) % 12 + 1, ":",
            this.leftPadZero(date.getMinutes()), ":",
            this.leftPadZero(date.getSeconds()), " ",
            hours > 11 ? "PM" : "AM"
        );
    },
    leftPadZero: function(num) {
        return num < 10 ? "0" + num : num;
    },
    updateTime: function() {
        this.setState({ now: Date.now() });
    }
});

var StaPrompt = React.createClass({
    displayName: "STAPrompt",
    getInitialState: function() {
        return { prompt: 'Super Tired Asians' };
    },
    componentDidMount: function() {
        setInterval(this.updatePrompt, 3000);
    },
    componentWillUnmount: function() {
        setInterval(this.updatePrompt, 3000);
    },
    render: function() {
        return r.div({ className: "Prompt" },
            this.state.prompt
        );
    },
    updatePrompt: function() {
        newPrompt = this.props.prompts[Math.floor(Math.random() * this.props.prompts.length)];
        this.setState({ prompt: newPrompt });
    }
});