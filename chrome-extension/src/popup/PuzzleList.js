import cx from "classnames";
import * as React from "react";

/**
 * Renders a group of puzzles. A "group" can mean anything from a meta round
 * to a set of puzzles with the same solve status.
 */
export default class PuzzleList extends React.Component {
    static getDerivedStateFromProps(props) {
        if (props.highlightedPuzzleKey) {
            // Something is highlighted; uncollapse to show it!
            return { isCollapsed: false };
        }
        return null;
    }

    constructor(props) {
        super(props);
        this.state = {
            isCollapsed: false
        };
    }

    render() {
        var props = this.props;
        return <div
            className={`PuzzleList${this.state.isCollapsed ? " isCollapsed" : ""}`}
        >
            <div
                className="PuzzleList-groupHeader"
                onClick={this.handleHeaderClick.bind(this)}
            >
                {props.groupName}
                {this.props.groupType === "round"
                    ? <span className="PuzzleList-numSolved">
                        {props.puzzles.filter(function(p) {
                            return p.status === "solved"
                        }).length}
                        /
                        {props.puzzles.length}
                    </span>
                    : null}
            </div>
            {this.renderPuzzles()}
        </div>;
    }

    renderPuzzles() {
        var props = this.props;
        return <ul className="PuzzleList-list">
            {props.puzzles.map(function(puzzle, i) {
                var numActiveViewers = props.puzzleViewers &&
                    props.puzzleViewers[puzzle.key];

                return <li key={puzzle.key}>
                    <a
                        className={cx({
                            "PuzzleList-puzzle": true,
                            [puzzle.status]: true,
                            "PuzzleList-puzzle--highlighted": this.props.highlightedPuzzleKey === puzzle.key,
                        })}
                        href={`http://${props.huntDomain + puzzle.path}`}
                        onClick={function(event) {
                            if (event.shiftKey || event.metaKey) {
                                return;
                            }
                            chrome.tabs.update({
                                url: "http://" + props.huntDomain + puzzle.path
                            });
                        }}
                        onMouseEnter={() => this.props.highlightGroupPuzzle({
                            groupKey: this.props.groupKey,
                            puzzle,
                        })}
                    >
                        <div className="PuzzleList-puzzleLabel">
                            <div className="PuzzleList-puzzleName">
                                {puzzle.name}
                            </div>
                            {(props.groupType === "round" && i === 0 && puzzle.isMeta) ||
                            (props.groupType === "status" && puzzle.isMeta)
                                ? <span className="PuzzleList-metaBadge">Meta</span>
                                : null}
                        </div>
                        <div className="PuzzleList-puzzleMetadata">
                            {numActiveViewers
                                ? <div className="PuzzleList-puzzleViewerCount">
                                    <PersonIcon />
                                    {numActiveViewers}
                                </div>
                                : null}
                            {puzzle.status === "solved"
                                ? <span className="PuzzleList-puzzleSolution">
                                    {puzzle.solution}
                                </span>
                                : null}
                        </div>
                    </a>
                </li>;
            }, this)}
        </ul>;
    }

    handleHeaderClick() {
        if (this.props.highlightedPuzzleKey) {
            // Clear the highlighted puzzle so we can collapse
            this.props.highlightGroupPuzzle(null);
        }
        this.setState({ isCollapsed: !this.state.isCollapsed });
    }
}

function PersonIcon() {
    return <svg className="PersonIcon" viewBox="0 0 24 24">
        <circle cx={12} cy={8} r={4} />
        <path d="M12,14c-6.1,0-8,4-8,4v2h16v-2C20,18,18.1,14,12,14z" />
    </svg>
}
