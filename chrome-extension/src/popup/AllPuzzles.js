import * as React from "react";
import PuzzleList from "./PuzzleList";

var PUZZLE_STATUSES = ["new", "stuck", "inProgress", "solved"];

export default class AllPuzzles extends React.Component {
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
            />
        </div>;
    }

    renderPuzzles() {
        switch (this.props.sortBy) {
            case "rounds":
                return this.props.puzzleGroups.map(function(pg) {
                    return <PuzzleList
                        key={pg[0].isMeta ? pg[0].key : "other"}
                        groupName={pg[0].isMeta ? pg[0].name : "Other Puzzles"}
                        groupType="round"
                        huntDomain={this.props.huntDomain}
                        puzzles={pg}
                        puzzleViewers={this.props.puzzleViewers}
                        searchInputValue={this.state.searchInputValue}
                    />;
                }, this);
            case "status":
                return PUZZLE_STATUSES.map(function(status) {
                    var puzzles = this.props.puzzlesByStatus[status];
                    if (puzzles.length === 0) {
                        return;
                    }
                    var readableStatus = status.replace(/([A-Z])/g, " $1");
                    return <PuzzleList
                        key={status}
                        groupName={readableStatus.charAt(0).toUpperCase() + readableStatus.slice(1)}
                        groupType={"status"}
                        huntDomain={this.props.huntDomain}
                        puzzles={puzzles}
                        puzzleViewers={this.props.puzzleViewers}
                        searchInputValue={this.state.searchInputValue}
                    />;
                }, this);
        }
    }

    handleSearchInputChange(event) {
        this.setState({ searchInputValue: event.target.value });
    }
}
