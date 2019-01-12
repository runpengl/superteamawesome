import * as classNames from "classnames";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { IPuzzleInfoChanges } from "../store/actions/puzzleActions";
import { IAppLifecycle, IPuzzle, IPuzzleGroup, IPuzzleHierarchy, PuzzleStatus } from "../store/state";
import { MetaSelector } from "./metaSelector";

export interface IPuzzleHierarchyProps {
    hierarchy: IPuzzleHierarchy;
    lifecycle: IAppLifecycle;
    puzzles: IPuzzle[];
    slackTeamId: string;
    onPuzzleNameChange: (puzzle: IPuzzle, newName: string) => void;
    onPuzzleDelete: (puzzle: IPuzzle) => void;
    onAssignMeta: (puzzle: IPuzzle, metaPuzzleKeys: string[]) => void;
    onRemoveMeta: (meta: IPuzzle, existingChildren: IPuzzle[]) => void;
}

interface IPuzzleHierarchyState {
    portalElement?: Element;
    isSelectingMeta: boolean;
    currentlyEditingPuzzle?: IPuzzle;
    puzzleChanges: { [key: string]: IPuzzleInfoChanges };
    groupUncollapsed: { [key: string]: boolean };
}

export class PuzzleHierarchy extends React.Component<IPuzzleHierarchyProps, IPuzzleHierarchyState> {
    public state: IPuzzleHierarchyState = {
        puzzleChanges: {},
        isSelectingMeta: false,
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
        let numSolvedPuzzles = group.children.filter(puzzle => puzzle.status === PuzzleStatus.SOLVED).length;
        if (group.parent.status === PuzzleStatus.SOLVED) {
            numSolvedPuzzles += 1;
        }
        return (
            <div className="puzzle-group" key={`parent-${group.parent.key}`}>
                <div className="puzzle-group-header" onClick={this.toggleCollapsed(group)}>
                    <span
                        className={classNames({
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
        const { lifecycle, slackTeamId } = this.props;
        const { puzzleChanges } = this.state;
        const puzzleRows = puzzles.map(puzzle => {
            const isDeleting = lifecycle.deletingPuzzleIds.indexOf(puzzle.key) >= 0;
            const puzzleName =
                puzzleChanges[puzzle.key] !== undefined && puzzleChanges[puzzle.key].title !== undefined
                    ? puzzleChanges[puzzle.key].title
                    : puzzle.name;
            const puzzleMetaDepth = this.getNumMetas(puzzle, 0);
            return (
                <tr key={puzzle.key}>
                    <td>
                        <span className="puzzle-status meta">
                            {puzzleMetaDepth > 0
                                ? Array.apply(null, { length: puzzleMetaDepth })
                                      .map(() => " META")
                                      .join("")
                                : undefined}
                        </span>
                    </td>
                    <td className="puzzle-name">
                        <input type="text" value={puzzleName} onChange={this.handlePuzzleNameChange(puzzle)} />
                    </td>
                    <td>
                        <span className={classNames(puzzle.status, "puzzle-status")}>
                            {puzzle.status.toUpperCase()}
                        </span>
                    </td>
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
                        <button onClick={this.getSelectorOpenHandler(puzzle)}>Assign to meta</button>
                        {this.maybeRenderMetaSelector(puzzle)}
                    </td>
                </tr>
            );
        });

        const metaName =
            puzzleChanges[meta.key] !== undefined && puzzleChanges[meta.key].title !== undefined
                ? puzzleChanges[meta.key].title
                : meta.name;
        const maxMetaDepth = this.getNumMetas(meta, 0);
        return (
            <table cellPadding="0" cellSpacing="0">
                <tbody>
                    {puzzleRows}
                    <tr>
                        <td>
                            <span className="puzzle-status meta">
                                {maxMetaDepth > 0
                                    ? Array.apply(null, { length: maxMetaDepth })
                                          .map(() => " META")
                                          .join("")
                                    : undefined}
                            </span>
                        </td>
                        <td>
                            <input type="text" value={metaName} onChange={this.handlePuzzleNameChange(meta)} />
                        </td>
                        <td>
                            <span className={classNames("puzzle-status", meta.status)}>
                                {meta.status.toUpperCase()}
                            </span>
                        </td>
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
                        <td>
                            <button onClick={this.removeMetaHandler(meta, puzzles)}>Remove meta</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }

    private getNumMetas(puzzle: IPuzzle, level: number): number {
        if (this.props.hierarchy[puzzle.key] === undefined || this.props.hierarchy[puzzle.key].children.length === 0) {
            return level;
        }

        const children = this.props.hierarchy[puzzle.key].children;
        return Math.max(...children.map(childPuzzle => this.getNumMetas(childPuzzle, level + 1)));
    }

    private maybeRenderMetaSelector(puzzle: IPuzzle) {
        const { isSelectingMeta, portalElement, currentlyEditingPuzzle } = this.state;
        if (
            isSelectingMeta &&
            portalElement !== undefined &&
            currentlyEditingPuzzle !== undefined &&
            currentlyEditingPuzzle.key === puzzle.key
        ) {
            return ReactDOM.createPortal(
                <MetaSelector
                    allPuzzles={this.props.puzzles}
                    puzzle={currentlyEditingPuzzle}
                    onClose={this.handleMetaSelectorClose}
                    onSave={this.handleAssignToMeta}
                />,
                portalElement,
            );
        }
        return undefined;
    }

    private handleAssignToMeta = (puzzle: IPuzzle, metas: string[]) => {
        this.props.onAssignMeta(puzzle, metas);
        this.handleMetaSelectorClose();
    };

    private removeMetaHandler(meta: IPuzzle, existingChildren: IPuzzle[]) {
        return () => this.props.onRemoveMeta(meta, existingChildren);
    }

    private handleMetaSelectorClose = () => {
        if (this.state.portalElement !== undefined) {
            this.state.portalElement.remove();
        }
        this.setState({ isSelectingMeta: false, currentlyEditingPuzzle: undefined });
    };

    private getSelectorOpenHandler(puzzle: IPuzzle) {
        return () => {
            const portalElement = document.createElement("div");
            portalElement.className = "dialog";
            document.body.appendChild(portalElement);
            this.setState({
                isSelectingMeta: true,
                portalElement,
                currentlyEditingPuzzle: puzzle,
            });
        };
    }
}
