import * as React from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import { isAsyncLoaded, IAsyncLoaded, loadPuzzlesAction } from "../actions";
import { IAppState, IPuzzle } from "../state";
import { IPuzzleHierarchy, PuzzleHierarchy } from "./puzzleHierarchy";

interface IOwnProps {
    huntKey: string;
    huntDomain: string;
    slackTeamId: string;
}

interface IDispatchProps {
    loadPuzzles?: (huntKey: string) => void;
}

interface IStateProps {
    puzzles?: IAsyncLoaded<IPuzzle[]>;
}

export interface IPuzzlesProps extends IOwnProps, IDispatchProps, IStateProps {}

export interface IPuzzlesState {
    hasChanges?: boolean;
    hierarchy?: IPuzzleHierarchy;
    parseError?: string;
    textHierarchy?: string[];
    unsortedPuzzles?: IPuzzle[];
}

class UnconnectedPuzzles extends React.Component<IPuzzlesProps, IPuzzlesState> {
    public state: IPuzzlesState = {
        hasChanges: false,
        hierarchy: {},
        textHierarchy: [],
        unsortedPuzzles: [],
    };

    public componentDidMount() {
        const { huntKey, loadPuzzles } = this.props;
        loadPuzzles(huntKey);
    }

    public componentDidUpdate(oldProps: IPuzzlesProps) {
        const { puzzles } = this.props;
        if (!isAsyncLoaded(oldProps.puzzles) && isAsyncLoaded(puzzles)
            || (isAsyncLoaded(oldProps.puzzles)
                && isAsyncLoaded(puzzles)
                && oldProps.puzzles.value.length !== puzzles.value.length)) {
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
                textHierarchy: this.translateHierarchyToText(hierarchy),
                unsortedPuzzles: puzzles.value.filter((puzzle) => puzzle.parent === undefined),
            });
        }
    }

    public render() {
        const { huntDomain, slackTeamId, puzzles } = this.props;
        const { hasChanges, hierarchy, parseError } = this.state;
        return (
            <div className="puzzles-container">
                <h3>Puzzles</h3>
                <button disabled={!hasChanges}>{ hasChanges ? "Save" : "Saved" }</button>
                <h5>Unsorted Puzzles</h5>
                {!isAsyncLoaded(puzzles) ? "Loading..." : this.renderUnsortedPuzzles()}
                <textarea
                    defaultValue={this.state.textHierarchy.join("\n")}
                    onChange={this.handleTextHierarchyChange}
                />
                <button disabled={!isAsyncLoaded(puzzles)} onClick={this.parseHierarchy}>Preview Hierarchy</button>
                { parseError !== undefined ? <div className="error">Error parsing: {parseError}</div> : undefined }
                <PuzzleHierarchy
                    hierarchy={hierarchy}
                    huntDomain={huntDomain}
                    slackTeamId={slackTeamId}
                />
            </div>
        )
    }

    private handleTextHierarchyChange = (event: React.FormEvent) => {
        const value = (event.target as HTMLTextAreaElement).value.trim();
        this.setState({ textHierarchy: value.split("\n") });
    }

    private parseHierarchy = () => {
        const { textHierarchy } = this.state;
        const puzzles = this.props.puzzles.value;
        let hierarchy: IPuzzleHierarchy = {};
        let error: string;
        let currentParent: string;
        let sortedPuzzleKeys: string[] = [];
        for (let i = 0; i < textHierarchy.length && error === undefined; i++) {
            const text = textHierarchy[i];
            let level = text.split(" ");
            if (currentParent === undefined && level.length === 1) {
                error = `${level} must either be nested or must be declared as a meta`;
                break;
            } else if (level.length === 2) {
                if (level[0] !== "META") {
                    error = `${level} is invalid syntax. Either list a parent as META [index] or list a puzzle as [index] beneath a parent`;
                    break;
                } else {
                    const parentIndex = parseInt(level[1]);
                    if (isNaN(parentIndex)) {
                        error = `The index found in ${level} is not a number`;
                        break;
                    } else {
                        currentParent = puzzles[parentIndex].key;
                        if (hierarchy[currentParent] !== undefined) {
                            error = `${hierarchy[currentParent].parent.name} is already defined as a puzzle group`;
                            break;
                        } else {
                            hierarchy[currentParent] = {
                                parent: puzzles[parentIndex],
                                children: [],
                            };
                        }
                    }
                }
            } else if (level.length === 1) {
                const puzzleIndex = parseInt(level[0]);
                if (isNaN(puzzleIndex)) {
                    error = `${level} is not a number`;
                    break;
                } else if (sortedPuzzleKeys.indexOf(puzzles[puzzleIndex].key) >= 0) {
                    error = `Puzzle ${puzzles[puzzleIndex].name} already has a parent`;
                    break;
                } else {
                    hierarchy[currentParent].children.push(puzzles[puzzleIndex]);
                    sortedPuzzleKeys.push(puzzles[puzzleIndex].key);
                }
            } else {
                error = `${level} must either be nested or must be declared as a meta`;
                break;
            }
        }

        if (error === undefined) {
            this.setState({ hasChanges: true, hierarchy, parseError: undefined });
        } else {
            this.setState({ parseError: error });
        }
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
        return `http://${host}${path}`;
    }

    private renderUnsortedPuzzles() {
        const { huntDomain, slackTeamId } = this.props;
        const { unsortedPuzzles } = this.state;
        const puzzleRows = unsortedPuzzles.map((puzzle) => {
            return (
                <tr key={puzzle.key}>
                    <td>{puzzle.index} {puzzle.name}</td>
                    <td>{puzzle.status.toUpperCase()}</td>
                    <td>{puzzle.createdAt}</td>
                    <td><a href={`slack://channel?id=${puzzle.slackChannelId}&team=${slackTeamId}`}>SLACK</a></td>
                    <td><a href={this.getGoogleSheetUrl(puzzle.spreadsheetId)} target="_blank">DOC</a></td>
                    <td><input type="text" readOnly={true} defaultValue={this.getPuzzleUrl(huntDomain, puzzle.path)} /></td>
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
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        loadPuzzles: loadPuzzlesAction,
    }, dispatch);
}

export const Puzzles = connect(mapStateToProps, mapDispatchToProps)(UnconnectedPuzzles);