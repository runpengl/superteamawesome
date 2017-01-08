import * as React from "react";

import { IPuzzleInfoChanges } from "../actions";
import { IPuzzle, IPuzzleGroup, IPuzzleHierarchy, PuzzleStatus } from "../state";

export interface IPuzzleHierarchyProps {
    hierarchy: IPuzzleHierarchy;
    onPuzzleNameChange: (puzzle: IPuzzle, newName: string) => void;
    slackTeamId: string;
}

interface IPuzzleHierarchyState {
    puzzleChanges?: { [key: string]: IPuzzleInfoChanges };
}

export class PuzzleHierarchy extends React.Component<IPuzzleHierarchyProps, IPuzzleHierarchyState> {
    public state: IPuzzleHierarchyState = {
        puzzleChanges: {},
    };

    public render() {
        const { hierarchy } = this.props;
        const hierarchyKeys = Object.keys(hierarchy);
        hierarchyKeys.sort((a, b) => {
            const aDate = new Date(hierarchy[a].parent.createdAt);
            const bDate = new Date(hierarchy[b].parent.createdAt);
            return aDate.valueOf() - bDate.valueOf();
        });
        return (
            <div className="hierarchy">
                {hierarchyKeys.map((key) => this.renderPuzzleGroup(hierarchy[key]))}
            </div>
        )
    }

    private renderPuzzleGroup(group: IPuzzleGroup) {
        const numSolvedPuzzles = group.children.filter((puzzle) => puzzle.status === PuzzleStatus.SOLVED).length;
        return (
            <div className="puzzle-group" key={`parent-${group.parent.key}`}>
                <div className="puzzle-group-header">
                    <h3>{group.parent.name} puzzles</h3>
                    <div className="group-stats">{numSolvedPuzzles}/{group.children.length + 1}</div>
                </div>
                {this.renderPuzzles(group.children, group.parent)}
            </div>
        )
    }

    private getGoogleSheetUrl(sheetId: string) {
        return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    }

    private getPuzzleUrl(host: string, path: string) {
        return `http://${host}${path}`;
    }

    private handlePuzzleNameChange = (puzzle: IPuzzle) => {
        return (event: React.FormEvent) => {
            const newName = (event.target as HTMLInputElement).value;
            this.props.onPuzzleNameChange(puzzle, newName);
            let changes = this.state.puzzleChanges;
            if (changes[puzzle.key] === undefined) {
                changes[puzzle.key] = {};
            }
            changes[puzzle.key].title = newName;
            this.setState({ puzzleChanges: changes });
        }
    }

    private renderPuzzles(puzzles: IPuzzle[], meta: IPuzzle) {
        const { slackTeamId } = this.props;
        const { puzzleChanges } = this.state;
        const puzzleRows = puzzles.map((puzzle) => {
            const puzzleName = puzzleChanges[puzzle.key] !== undefined && puzzleChanges[puzzle.key].title !== undefined ? puzzleChanges[puzzle.key].title : puzzle.name;
            return (
                <tr key={puzzle.key}>
                    <td><span className="puzzle-index">{puzzle.index}</span> <input type="text" value={puzzleName} onChange={this.handlePuzzleNameChange(puzzle)} /></td>
                    <td>{puzzle.status.toUpperCase()}</td>
                    <td><a href={`slack://channel?id=${puzzle.slackChannelId}&team=${slackTeamId}`}>SLACK</a></td>
                    <td><a href={this.getGoogleSheetUrl(puzzle.spreadsheetId)} target="_blank">DOC</a></td>
                    <td><input type="text" readOnly={true} defaultValue={this.getPuzzleUrl(puzzle.host, puzzle.path)} /></td>
                </tr>
            );
        });

        const metaName = puzzleChanges[meta.key] !== undefined && puzzleChanges[meta.key].title !== undefined ? puzzleChanges[meta.key].title : meta.name;
        return (
            <table cellPadding="0" cellSpacing="0">
                <tbody>
                    {puzzleRows}
                    <tr>
                        <td><span className="puzzle-index">{meta.index}</span> <input type="text" value={metaName} onChange={this.handlePuzzleNameChange(meta)} /></td>
                        <td>{meta.status.toUpperCase()}</td>
                        <td><a href={`slack://channel?id=${meta.slackChannelId}&team=${slackTeamId}`}>SLACK</a></td>
                        <td><a href={this.getGoogleSheetUrl(meta.spreadsheetId)} target="_blank">DOC</a></td>
                        <td><input type="text" readOnly={true} defaultValue={this.getPuzzleUrl(meta.host, meta.path)} /></td>
                    </tr>
                </tbody>
            </table>
        );
    }
}