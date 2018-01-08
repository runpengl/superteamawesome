import cx from "classnames";
import * as React from "react";

const PUZZLE_STATUSES = ["new", "inProgress", "stuck", "solved"];

class PuzzleStatusPicker extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isCollapsed: true,
            optimisticStatusUpdate: null,
            solutionText: null
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.puzzle.status === this.state.optimisticStatusUpdate) {
            this.setState({ optimisticStatusUpdate: null });
        }
        if (nextProps.puzzle.solution === this.state.optimisticSolution) {
            this.setState({ optimisticSolution: null });
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.solutionText === null &&
            this.state.solutionText !== null) {
            this.refs.solutionInput.focus();
        }
    }

    render() {
        var displaySolution = this.state.optimisticSolution
            || this.props.puzzle.solution
            || "(no solution)";
        return <div
            className={cx({
                PuzzleStatusPicker: true,
                isCollapsed: this.state.isCollapsed
            })}
        >
            {PUZZLE_STATUSES.map((status) => {
                var currentStatus = this.state.optimisticStatusUpdate ||
                    this.props.puzzle.status;
                return <div
                    key={status}
                    className={cx({
                        "PuzzleStatusPicker-statusButton": true,
                        isCurrent: currentStatus === status,
                        isPending: this.state.optimisticStatusUpdate
                    }, status)}
                    onClick={this.handleStatusClick.bind(this, status)}
                >
                    {this.toHumanReadable(status)}
                </div>;
            })}
            {this.state.optimisticStatusUpdate === "solved" || this.props.puzzle.status === "solved"
                ? <div className="PuzzleStatusPicker-solution">
                    {this.state.solutionText === null
                        ? <div
                            className="PuzzleStatusPicker-solutionButton"
                            onClick={this.handleSolutionClick.bind(this)}
                        >{displaySolution}</div>
                        : <input
                            ref="solutionInput"
                            className="PuzzleStatusPicker-solutionInput"
                            value={this.state.solutionText}
                            placeholder="SOLUTION"
                            onBlur={this.submitSolution.bind(this)}
                            onChange={this.handleSolutionChange.bind(this)}
                            onKeyDown={this.handleSolutionInputKeyDown.bind(this)}
                        />
                    }
                </div>
                : null}
        </div>;
    }

    toHumanReadable(statusStr) {
        return statusStr.replace(/([A-Z])/g, " $1").toLowerCase();
    }

    handleStatusClick(status, event) {
        if (this.state.isCollapsed) {
            this.setState({ isCollapsed: false });
            return;
        }
        if (status !== this.props.puzzle.status) {
            this.setState({ optimisticStatusUpdate: status });
            if (status === "solved") {
                // If solved, wait for solution input before sending status change
                this.setState({ solutionText: "" });
            } else {
                chrome.runtime.sendMessage({
                    msg: "puzzleStatusChange",
                    status: status
                });
            }
        }
        this.setState({ isCollapsed: true });
        event.preventDefault();
    }

    handleSolutionClick() {
        this.setState({ solutionText: this.props.puzzle.solution });
    }

    handleSolutionChange(event) {
        this.setState({ solutionText: event.target.value });
    }

    submitSolution() {
        var solution = this.state.solutionText.trim().toUpperCase();
        if (solution) {
            chrome.runtime.sendMessage({
                msg: "puzzleSolutionChange",
                solution: this.state.solutionText.toUpperCase()
            });
            if (this.state.optimisticStatusUpdate === "solved") {
                // Commit status change
                chrome.runtime.sendMessage({
                    msg: "puzzleStatusChange",
                    status: "solved"
                });
            }
        } else {
            if (this.props.puzzle.status === "solved") {
                // If puzzle was already marked as solved, leave it (set solution to empty string)
                chrome.runtime.sendMessage({
                    msg: "puzzleSolutionChange",
                    solution: ""
                });
            }
            // If the puzzle was optimistically set as solved, revert to previous status
            this.setState({ optimisticStatusUpdate: null });
        }
        this.setState({
            optimisticSolution: this.state.solutionText,
            solutionText: null
        });
    }

    handleSolutionInputKeyDown(event) {
        if (event.key === "Enter") {
            this.submitSolution();
        }
    }
}

export default PuzzleStatusPicker;
