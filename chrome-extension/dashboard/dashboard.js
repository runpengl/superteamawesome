window.onload = function() {
    ReactDOM.render(
        React.createElement(Clock),
        document.getElementById("clock")
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
