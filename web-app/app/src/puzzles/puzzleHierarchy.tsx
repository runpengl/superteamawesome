import * as classnames from "classnames";
import * as React from "react";

import { IPuzzleInfoChanges } from "../store/actions/puzzleActions";
import { IAppLifecycle, IPuzzle, IPuzzleGroup, IPuzzleHierarchy, PuzzleStatus } from "../store/state";

export interface IPuzzleHierarchyProps {
    hierarchy: IPuzzleHierarchy;
    lifecycle: IAppLifecycle;
    onPuzzleNameChange: (puzzle: IPuzzle, newName: string) => void;
    onPuzzleDelete: (puzzle: IPuzzle) => void;
    puzzles: IPuzzle[];
    slackTeamId: string;
    onAssignMeta: (puzzle: IPuzzle, metaPuzzleKey: string) => void;
}

interface IPuzzleHierarchyState {
    puzzleChanges?: { [key: string]: IPuzzleInfoChanges };
    groupUncollapsed?: { [key: string]: boolean };
}

export class PuzzleHierarchy extends React.Component<IPuzzleHierarchyProps, IPuzzleHierarchyState> {
    public state: IPuzzleHierarchyState = {
        puzzleChanges: {},
        groupUncollapsed: {},
    };

    public render() {
        const { hierarchy } = this.props;
        const hierarchyKeys = Object.keys(hierarchy);
        hierarchyKeys.sort((a, b) => {
            const aDate = new Date(hierarchy[a].parent.createdAt);
            const bDate = new Date(hierarchy[b].parent.createdAt);
            return aDate.valueOf() - bDate.valueOf();
        });
        return <div className="hierarchy">{hierarchyKeys.map(key => this.renderPuzzleGroup(hierarchy[key]))}</div>;
    }

    private renderPuzzleGroup(group: IPuzzleGroup) {
        const { groupUncollapsed } = this.state;
        const numSolvedPuzzles = group.children.filter(puzzle => puzzle.status === PuzzleStatus.SOLVED).length;
        return (
            <div className="puzzle-group" key={`parent-${group.parent.key}`}>
                <div className="puzzle-group-header" onClick={this.toggleCollapsed(group)}>
                    <span
                        className={classnames({
                            collapsed: !groupUncollapsed[group.parent.key],
                            uncollapsed: groupUncollapsed[group.parent.key],
                        })}
                    />
                    <h3>{group.parent.name} Puzzles</h3>
                    <div className="group-stats">
                        {numSolvedPuzzles}/{group.children.length + 1}
                    </div>
                </div>
                {groupUncollapsed[group.parent.key] ? this.renderPuzzles(group.children, group.parent) : undefined}
            </div>
        );
    }

    private toggleCollapsed = (group: IPuzzleGroup) => {
        return () => {
            const { groupUncollapsed } = this.state;
            const isCollapsed = groupUncollapsed[group.parent.key] ? false : true;
            this.setState({
                groupUncollapsed: { ...groupUncollapsed, [group.parent.key]: isCollapsed },
            });
        };
    };

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
            const newName = (event.target as HTMLInputElement).value;
            this.props.onPuzzleNameChange(puzzle, newName);
            const changes = this.state.puzzleChanges;
            if (changes[puzzle.key] === undefined) {
                changes[puzzle.key] = {};
            }
            changes[puzzle.key].title = newName;
            this.setState({ puzzleChanges: changes });
        };
    };

    private handleDelete = (puzzle: IPuzzle) => {
        const { onPuzzleDelete } = this.props;
        return () => {
            onPuzzleDelete(puzzle);
        };
    };

    private renderPuzzles(puzzles: IPuzzle[], meta: IPuzzle) {
        const { lifecycle, slackTeamId, puzzles: allPuzzles } = this.props;
        const { puzzleChanges } = this.state;
        const puzzleRows = puzzles.map(puzzle => {
            const isDeleting = lifecycle.deletingPuzzleIds.indexOf(puzzle.key) >= 0;
            const puzzleName =
                puzzleChanges[puzzle.key] !== undefined && puzzleChanges[puzzle.key].title !== undefined
                    ? puzzleChanges[puzzle.key].title
                    : puzzle.name;
            return (
                <tr key={puzzle.key}>
                    <td>
                        <span className="puzzle-index">{puzzle.index}</span>{" "}
                        <input type="text" value={puzzleName} onChange={this.handlePuzzleNameChange(puzzle)} />
                    </td>
                    <td>{puzzle.status.toUpperCase()}</td>
                    <td>
                        <a href={`slack://channel?id=${puzzle.slackChannelId}&team=${slackTeamId}`}>SLACK</a>
                    </td>
                    <td>
                        <a href={this.getGoogleSheetUrl(puzzle.spreadsheetId)} target="_blank">
                            DOC
                        </a>
                    </td>
                    <td>
                        <input type="text" readOnly={true} defaultValue={this.getPuzzleUrl(puzzle.host, puzzle.path)} />
                    </td>
                    <td>
                        <button disabled={isDeleting} onClick={this.handleDelete(puzzle)}>
                            {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                    </td>
                    <td>
                        <select onChange={this.assignToMeta(puzzle)}>
                            <option>Move to meta...</option>
                            {allPuzzles
                                .filter(allPuzzle => allPuzzle.isMeta)
                                .map(allPuzzle => (
                                    <option key={allPuzzle.key} value={allPuzzle.key}>
                                        {allPuzzle.name}
                                    </option>
                                ))}
                        </select>
                    </td>
                </tr>
            );
        });

        const metaName =
            puzzleChanges[meta.key] !== undefined && puzzleChanges[meta.key].title !== undefined
                ? puzzleChanges[meta.key].title
                : meta.name;
        return (
            <table cellPadding="0" cellSpacing="0">
                <tbody>
                    {puzzleRows}
                    <tr>
                        <td>
                            <span className="puzzle-index">{meta.index}</span>{" "}
                            <input type="text" value={metaName} onChange={this.handlePuzzleNameChange(meta)} /> Meta
                        </td>
                        <td>{meta.status.toUpperCase()}</td>
                        <td>
                            <a href={`slack://channel?id=${meta.slackChannelId}&team=${slackTeamId}`}>SLACK</a>
                        </td>
                        <td>
                            <a href={this.getGoogleSheetUrl(meta.spreadsheetId)} target="_blank">
                                DOC
                            </a>
                        </td>
                        <td>
                            <input type="text" readOnly={true} defaultValue={this.getPuzzleUrl(meta.host, meta.path)} />
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }

    private assignToMeta(puzzle: IPuzzle) {
        return (event: React.ChangeEvent<HTMLSelectElement>) => {
            if (event.target.value !== puzzle.key) {
                this.props.onAssignMeta(puzzle, event.target.value);
            }
        };
    }
}
