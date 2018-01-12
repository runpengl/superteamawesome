import * as moment from "moment";
import * as React from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";
import { isEqual } from "lodash";

import {
    createManualPuzzleAction,
    deletePuzzleAction,
    isAsyncLoaded,
    IAsyncLoaded,
    IPuzzleInfoChanges,
    loadPuzzlesAction,
    saveHierarchyAction,
    assignToMetaAction,
} from "../actions";
import { IAppState, IAppLifecycle, IPuzzle, IPuzzleHierarchy } from "../state";
import { PuzzleHierarchy } from "./puzzleHierarchy";
import { toggleMetaAction } from '../actions/puzzleActions';

interface IOwnProps {
    huntKey: string;
    slackTeamId: string;
}

interface IDispatchProps {
    createManualPuzzle?: (puzzleName: string, puzzleLink: string) => void;
    deletePuzzle?: (puzzle: IPuzzle) => void;
    loadPuzzles?: (huntKey: string) => void;
    saveHierarchy?: (hierarchy: IPuzzleHierarchy, puzzleChanges: { [key: string]: IPuzzleInfoChanges}) => void;
    toggleMeta?: (puzzle: IPuzzle, isMeta: boolean) => void;
    assignToMeta?: (puzzle: IPuzzle, metaParentKey: string) => void;
}

interface IStateProps {
    lifecycle?: IAppLifecycle;
    puzzles?: IAsyncLoaded<IPuzzle[]>;
}

export interface IPuzzlesProps extends IOwnProps, IDispatchProps, IStateProps {}

export interface IPuzzlesState {
    hasChanges?: boolean;
    hierarchy?: IPuzzleHierarchy;
    isHierarchyLoaded?: boolean;
    newPuzzleName?: string;
    newPuzzleLink?: string;
    parseError?: string;
    puzzleChanges?: { [key: string]: IPuzzleInfoChanges };
    textHierarchy?: string[];
    unsortedPuzzles?: IPuzzle[];
}

class UnconnectedPuzzles extends React.Component<IPuzzlesProps, IPuzzlesState> {
    public state: IPuzzlesState = {
        hasChanges: false,
        hierarchy: {},
        isHierarchyLoaded: false,
        newPuzzleName: "",
        newPuzzleLink: "",
        puzzleChanges: {},
        textHierarchy: [],
        unsortedPuzzles: [],
    };

    public componentDidMount() {
        const { huntKey, loadPuzzles } = this.props;
        loadPuzzles(huntKey);
    }

    public componentDidUpdate(oldProps: IPuzzlesProps) {
        const { puzzles, lifecycle } = this.props;
        if (!isAsyncLoaded(oldProps.puzzles) && isAsyncLoaded(puzzles)
            || (isAsyncLoaded(oldProps.puzzles)
                && isAsyncLoaded(puzzles)
                && oldProps.puzzles.value.length !== puzzles.value.length)
            || (isAsyncLoaded(puzzles) && !this.state.isHierarchyLoaded)
            || (isAsyncLoaded(puzzles) && isAsyncLoaded(oldProps.puzzles) && !isEqual(puzzles.value, oldProps.puzzles.value))) {
            // puzzles have changed, reevaluate hierarchy
            let hierarchy: IPuzzleHierarchy = {};
            let sortedPuzzles = puzzles.value.filter((puzzle) => puzzle.parent !== undefined);
            sortedPuzzles.forEach((puzzle) => {
                const parentKey = puzzle.parent;
                if (hierarchy[parentKey] === undefined) {
                    hierarchy[parentKey] = {
                        parent: puzzles.value.find((puzzle) => puzzle.key === parentKey),
                        children: [],
                    };
                }

                hierarchy[parentKey].children.push(puzzle);
            });

            this.setState({
                hierarchy,
                isHierarchyLoaded: true,
                textHierarchy: this.translateHierarchyToText(hierarchy),
                unsortedPuzzles: puzzles.value.filter((puzzle) => puzzle.parent === undefined),
            });
        }

        if (oldProps.lifecycle.creatingManualPuzzle && !lifecycle.creatingManualPuzzle) {
            this.setState({
                newPuzzleLink: "",
                newPuzzleName: "",
            });
        }
    }

    public render() {
        const { lifecycle, slackTeamId, puzzles } = this.props;
        const { hierarchy, newPuzzleName, newPuzzleLink } = this.state;
        return (
            <div className="puzzles-wrapper">
                <div className="puzzles-container">
                    <h3>Puzzles</h3>
                    <h5>Manually add puzzle</h5>
                    <div className="add-puzzle-form">
                        <div className="error">
                            {lifecycle.createManualPuzzleFailure !== undefined ? lifecycle.createManualPuzzleFailure.message : undefined}
                        </div>
                        <div className="add-puzzle-form-line">
                            <label>Name</label>
                            <input type="text" value={newPuzzleName} onChange={this.handleNewPuzzleNameChange} />
                        </div>
                        <div className="add-puzzle-form-line">
                            <label>Puzzle Link</label>
                            <input type="text" value={newPuzzleLink} onChange={this.handlenewPuzzleLinkChange} />
                            <div className="help-text">Links that already exist will be ignored by the extension</div>
                        </div>
                        <button disabled={lifecycle.creatingManualPuzzle || newPuzzleName.length === 0 || newPuzzleLink.length === 0} onClick={this.handleCreateManualPuzzle}>
                            {lifecycle.creatingManualPuzzle ? "Creating..." : "Create"}
                        </button>
                    </div>
                    <h5>Unsorted Puzzles</h5>
                    <div className="unsorted-puzzles-container">
                        {!isAsyncLoaded(puzzles) ? "Loading..." : this.renderUnsortedPuzzles()}
                    </div>
                    <PuzzleHierarchy
                        hierarchy={hierarchy}
                        lifecycle={lifecycle}
                        onPuzzleDelete={this.onPuzzleDelete}
                        onPuzzleNameChange={this.onPuzzleNameChange}
                        slackTeamId={slackTeamId}
                        onAssignMeta={this.props.assignToMeta}
                        puzzles={puzzles.value}
                    />
                </div>
            </div>
        )
    }

    private handleCreateManualPuzzle = () => {
        const { createManualPuzzle } = this.props;
        const { newPuzzleLink, newPuzzleName } = this.state;
        createManualPuzzle(newPuzzleName, newPuzzleLink);
    }

    private handleNewPuzzleNameChange = (event: React.FormEvent<HTMLInputElement>) => {
        const newPuzzleName = (event.target as HTMLInputElement).value;
        this.setState({ newPuzzleName });
    }

    private handlenewPuzzleLinkChange = (event: React.FormEvent<HTMLInputElement>) => {
        const newPuzzleLink = (event.target as HTMLInputElement).value;
        this.setState({ newPuzzleLink });
    }

    private translateHierarchyToText(hierarchy: IPuzzleHierarchy) {
        let text: string[] = [];
        Object.keys(hierarchy).forEach((groupKey) => {
            const group = hierarchy[groupKey];
            text.push(`META ${group.parent.index}`);
            group.children.forEach((puzzle) => {
                text.push(puzzle.index.toString());
            });
        });
        return text;
    }

    private getGoogleSheetUrl(sheetId: string) {
        return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    }

    private getPuzzleUrl(host: string, path: string) {
        if (host != null) {
            return `http://${host}${path}`;
        } else {
            return "";
        }
    }

    private handlePuzzleNameChange = (puzzle: IPuzzle) => {
        return (event: React.FormEvent<HTMLInputElement>) => {
            const value = (event.target as HTMLInputElement).value;
            this.onPuzzleNameChange(puzzle, value);
        };
    }

    private onPuzzleNameChange = (puzzle: IPuzzle, newName: string) => {
        const changes = Object.assign({}, this.state.puzzleChanges);
        if (changes[puzzle.key] === undefined) {
            changes[puzzle.key] = {};
        }
        changes[puzzle.key].title = newName;
        this.setState({
            hasChanges: true,
            puzzleChanges: changes,
        });
    }

    private onPuzzleDelete = (puzzle: IPuzzle) => {
        const { deletePuzzle } = this.props;
        if (window.confirm("This will delete the associated Google Spreadsheet and archive the Slack channel, are you sure you want to proceed?")) {
            deletePuzzle(puzzle);
        }
    }

    private handleDeletePuzzle = (puzzle: IPuzzle) => {
        return () => {
            this.onPuzzleDelete(puzzle);
        };
    }

    private toggleMeta = (puzzle: IPuzzle) => {
        return () => {
            this.props.toggleMeta(puzzle, !puzzle.isMeta);
        }
    }

    private handleAssignment(puzzle: IPuzzle) {
        return (event: React.ChangeEvent<HTMLSelectElement>) => {
            if (event.target.value !== puzzle.key) {
                this.props.assignToMeta(puzzle, event.target.value);
            }
        }
    }

    private renderUnsortedPuzzles() {
        const { lifecycle, slackTeamId, puzzles } = this.props;
        const { unsortedPuzzles, puzzleChanges } = this.state;
        const puzzleRows = unsortedPuzzles.map((puzzle) => {
            const puzzleName = puzzleChanges[puzzle.key] !== undefined && puzzleChanges[puzzle.key].title !== undefined ? puzzleChanges[puzzle.key].title : puzzle.name;
            const date = moment(puzzle.createdAt).format("MMM DD, YYYY hh:mm A");
            const isDeleting = lifecycle.deletingPuzzleIds.indexOf(puzzle.key) >= 0;
            return (
                <tr key={puzzle.key}>
                    <td>{puzzle.index} <input type="text" value={puzzleName} onChange={this.handlePuzzleNameChange(puzzle)} /></td>
                    <td>{puzzle.status.toUpperCase()}</td>
                    <td>{date}</td>
                    <td><a href={`slack://channel?id=${puzzle.slackChannelId}&team=${slackTeamId}`}>SLACK</a></td>
                    <td><a href={this.getGoogleSheetUrl(puzzle.spreadsheetId)} target="_blank">DOC</a></td>
                    <td><input type="text" readOnly={true} defaultValue={this.getPuzzleUrl(puzzle.host, puzzle.path)} /></td>
                    <td>
                        <button
                            disabled={isDeleting}
                            onClick={this.handleDeletePuzzle(puzzle)}
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                        <button onClick={this.toggleMeta(puzzle)}>
                            {puzzle.isMeta ? "Remove meta" : "Mark as Meta"}
                        </button>
                        <select onChange={this.handleAssignment(puzzle)}>
                            <option>Assign to meta...</option>
                            {puzzles.value.filter(puzzle => puzzle.isMeta).map(metaPuzzle => (
                                <option value={metaPuzzle.key} key={metaPuzzle.key}>{metaPuzzle.name}</option>
                            ))}
                        </select>
                    </td>
                </tr>
            );
        });
        return (
            <table cellPadding="0" cellSpacing="0">
                <thead>
                    <tr>
                        <th>Puzzle</th>
                        <th>Status</th>
                        <th>Created At</th>
                        <th colSpan={3}>Links</th>
                        <th colSpan={3}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {puzzleRows}
                </tbody>
            </table>
        );
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    return {
        puzzles: state.puzzles,
        lifecycle: state.lifecycle,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        createManualPuzzle: createManualPuzzleAction,
        deletePuzzle: deletePuzzleAction,
        loadPuzzles: loadPuzzlesAction,
        saveHierarchy: saveHierarchyAction,
        toggleMeta: toggleMetaAction,
        assignToMeta: assignToMetaAction,
    }, dispatch);
}

export const Puzzles = connect(mapStateToProps, mapDispatchToProps)(UnconnectedPuzzles);