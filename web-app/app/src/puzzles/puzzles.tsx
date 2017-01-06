import * as React from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import { isAsyncLoaded, IAsyncLoaded, loadPuzzlesAction } from "../actions";
import { IAppState, IPuzzle } from "../state";

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

}

class UnconnectedPuzzles extends React.Component<IPuzzlesProps, IPuzzlesState> {
    public componentDidMount() {
        const { huntKey, loadPuzzles } = this.props;
        loadPuzzles(huntKey);
    }

    public render() {
        const { puzzles } = this.props;
        return (
            <div className="puzzles-container">
                <h3>Puzzles</h3>
                {!isAsyncLoaded(puzzles) ? "Loading..." : this.renderPuzzles(puzzles.value)}
            </div>
        )
    }

    private getPuzzleUrl(host: string, path: string) {
        return `http://${host}${path}`;
    }

    private getGoogleSheetUrl(sheetId: string) {
        return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    }

    private renderPuzzles(puzzles: IPuzzle[]) {
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