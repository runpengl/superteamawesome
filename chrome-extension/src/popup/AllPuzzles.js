import * as React from "react";
import PuzzleList from "./PuzzleList";

var PUZZLE_STATUSES = ["new", "stuck", "inProgress", "solved"];

export default class AllPuzzles extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            searchInputValue: "",
            // { groupKey, puzzleKey }
            highlightedGroupPuzzle: null,
        };
    }

    componentDidMount() {
        if (this.searchInputNode) {
            this.searchInputNode.focus();
        }
    }

    componentDidUpdate() {
        if (
            // IF: We filtered out the highlighted puzzle,
            (this.state.highlightedGroupPuzzle && this.indexOfHighlightedGroupPuzzle() === -1) ||
            // OR: There's nothing highlighted, but we're still searching
            (!this.state.highlightedGroupPuzzle && this.state.searchInputValue.trim() !== "")
        ) {
            // THEN: try to highlight something new
            this.highlightGroupPuzzle(this.firstGroupPuzzleOrNull());
        }
    }

    render() {
        return <div className="AllPuzzles">
            {this.props.puzzles.length === 0
                ? <>
                    <div className="AllPuzzles-emptyImage" />
                    <div
                        key="emptyMsg"
                        className="AllPuzzles-empty"
                    >No puzzles yet. Check back later!</div>
                </>
                : <>
                    {this.renderSearchInput()}
                    {this.renderPuzzles()}
                </>}
        </div>;
    }

    renderSearchInput() {
        return <div className="AllPuzzles-search">
            <input
                ref={n => this.searchInputNode = n} // autofocus
                className="AllPuzzles-searchInput"
                placeholder="Search Puzzles"
                value={this.state.searchInputValue}
                onChange={this.handleSearchInputChange.bind(this)}
                onKeyDown={this.handleSearchKeyDown.bind(this)}
            />
        </div>;
    }

    renderPuzzles() {
        return this.groupedPuzzles().map(group => {
            return <PuzzleList
                key={group.key}
                groupKey={group.key}
                groupName={group.groupName}
                groupType={group.groupType}
                puzzles={group.puzzles}
                puzzleViewers={this.props.puzzleViewers}
                huntDomain={this.props.huntDomain}
                highlightedPuzzleKey={
                    this.state.highlightedGroupPuzzle &&
                    this.state.highlightedGroupPuzzle.groupKey === group.key
                        ? this.state.highlightedGroupPuzzle.puzzleKey
                        : null
                }
                highlightGroupPuzzle={this.highlightGroupPuzzle.bind(this)}
            />;
        });
    }

    groupedPuzzles() {
        switch (this.props.sortBy) {
            case "rounds":
                return this.props.puzzleGroups.map(function(pg) {
                    const puzzles = pg.filter(this.filterBySearchInputValue, this);
                    if (puzzles.length === 0) {
                        return null;
                    }
                    return {
                        key: pg[0].isMeta ? pg[0].key : "other",
                        groupName: pg[0].isMeta ? pg[0].name : "Other Puzzles",
                        groupType: "round",
                        puzzles
                    };
                }, this).filter(group => group !== null);
            case "status":
                return PUZZLE_STATUSES.map(function(status) {
                    var puzzles = this.props.puzzlesByStatus[status]
                        .filter(this.filterBySearchInputValue, this);
                    if (puzzles.length === 0) {
                        return null;
                    }
                    var readableStatus = status.replace(/([A-Z])/g, " $1");
                    return {
                        key: status,
                        groupName: readableStatus.charAt(0).toUpperCase() + readableStatus.slice(1),
                        groupType: "status",
                        puzzles
                    };
                }, this).filter(group => group !== null);
        }
    }

    filterBySearchInputValue(puzzle) {
        return puzzle.name.toLowerCase().indexOf(this.state.searchInputValue.toLowerCase()) !== -1;
    }

    allGroupPuzzles() {
        const puzzles = this.groupedPuzzles().map(group => {
            return group.puzzles.map(puzzle => ({
                groupKey: group.key,
                puzzle,
            }));
        })

        // Flatten the list
        return [].concat.apply([], puzzles);
    }

    firstGroupPuzzleOrNull() {
        const allGroupPuzzles = this.allGroupPuzzles();
        return allGroupPuzzles.length ? allGroupPuzzles[0] : null;
    }

    indexOfHighlightedGroupPuzzle() {
        if (this.state.highlightedGroupPuzzle === null) {
            return -1;
        }
        return this.allGroupPuzzles().findIndex(({ groupKey, puzzle }) => {
            return groupKey === this.state.highlightedGroupPuzzle.groupKey &&
                puzzle.key === this.state.highlightedGroupPuzzle.puzzleKey;
        });
    }

    handleSearchInputChange(event) {
        const searchInputValue = event.target.value;
        this.setState({ searchInputValue });

        if (searchInputValue.trim() === "") {
            // User is no longer searching; clear the highlight
            this.setState({
                highlightedGroupPuzzle: null
            });
        }
    }

    handleSearchKeyDown(event) {
        switch (event.key) {
            case "ArrowDown":
                this.shiftHighlight(/*down*/ true);
                break;

            case "ArrowUp":
                this.shiftHighlight(/*down*/ false);
                break;

            case "Enter":
                const highlightedGroupPuzzle = this.state.highlightedGroupPuzzle;
                if (highlightedGroupPuzzle) {
                    const { puzzleKey } = highlightedGroupPuzzle;
                    const puzzle = this.props.puzzles.find(({ key }) => key === puzzleKey);
                    const url = `http://${this.props.huntDomain + puzzle.path}`;
                    if (event.shiftKey) {
                        chrome.windows.create({ url });
                    } else if (event.metaKey) {
                        chrome.tabs.create({ url });
                    } else {
                        chrome.tabs.update({ url });
                    }
                }
                break;
        }
    }

    highlightGroupPuzzle(maybeGroupPuzzle) {
        if (!maybeGroupPuzzle && !this.state.highlightedGroupPuzzle) {
            // Nothing to do
            return;
        }
        this.setState({
            highlightedGroupPuzzle: maybeGroupPuzzle && {
                groupKey: maybeGroupPuzzle.groupKey,
                puzzleKey: maybeGroupPuzzle.puzzle.key,
            },
        });
    }

    shiftHighlight(down) {
        if (!this.state.highlightedGroupPuzzle) {
            // Nothing highlighted; highlighted first puzzle (if it exists)
            this.highlightGroupPuzzle(this.firstGroupPuzzleOrNull());
        } else {
            const index = this.indexOfHighlightedGroupPuzzle();
            const allGroupPuzzles = this.allGroupPuzzles();
            const indexToHighlight =
                (index + (down ? 1 : -1) + allGroupPuzzles.length) % allGroupPuzzles.length;
            this.highlightGroupPuzzle(allGroupPuzzles[indexToHighlight]);
        }
    }
}
