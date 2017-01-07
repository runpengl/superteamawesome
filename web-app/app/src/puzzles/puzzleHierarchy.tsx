import * as React from "react";

import { IPuzzle, IPuzzleGroup, IPuzzleHierarchy, PuzzleStatus } from "../state";

export interface IPuzzleHierarchyProps {
    hierarchy: IPuzzleHierarchy;
    huntDomain: string;
    slackTeamId: string;
}

export class PuzzleHierarchy extends React.Component<IPuzzleHierarchyProps, {}> {
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

    private renderPuzzles(puzzles: IPuzzle[], meta: IPuzzle) {
        const { huntDomain, slackTeamId } = this.props;
        const puzzleRows = puzzles.map((puzzle) => {
            return (
                <tr key={puzzle.key}>
                    <td>{puzzle.index} {puzzle.name}</td>
                    <td>{puzzle.status.toUpperCase()}</td>
                    <td><a href={`slack://channel?id=${puzzle.slackChannelId}&team=${slackTeamId}`}>SLACK</a></td>
                    <td><a href={this.getGoogleSheetUrl(puzzle.spreadsheetId)} target="_blank">DOC</a></td>
                    <td><input type="text" readOnly={true} defaultValue={this.getPuzzleUrl(huntDomain, puzzle.path)} /></td>
                </tr>
            );
        });
        return (
            <table cellPadding="0" cellSpacing="0">
                <tbody>
                    {puzzleRows}
                    <tr>
                        <td>{meta.index} {meta.name} Meta</td>
                        <td>{meta.status.toUpperCase()}</td>
                        <td><a href={`slack://channel?id=${meta.slackChannelId}&team=${slackTeamId}`}>SLACK</a></td>
                        <td><a href={this.getGoogleSheetUrl(meta.spreadsheetId)} target="_blank">DOC</a></td>
                        <td><input type="text" readOnly={true} defaultValue={this.getPuzzleUrl(huntDomain, meta.path)} /></td>
                    </tr>
                </tbody>
            </table>
        );
    }
}