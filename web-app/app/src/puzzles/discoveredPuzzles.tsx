import * as React from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import { IAsyncLoaded, isAsyncLoaded, loadDiscoveredPuzzlesAction } from "../actions";
import { IAppState, IDiscoveredPuzzle } from "../state";

interface IOwnProps {
    huntKey: number;
    titleRegex: string;
}

interface IDispatchProps {
    loadDiscoveredPuzzles?: (huntKey: number) => void;
}

interface IStateProps {
    discoveredPuzzles?: IAsyncLoaded<IDiscoveredPuzzle[]>;
}
interface IDiscoveredPuzzlesProps extends IOwnProps, IDispatchProps, IStateProps {}

class UnconnectedDiscoveredPuzzles extends React.Component<IDiscoveredPuzzlesProps, {}> {
    public componentDidMount() {
        const { huntKey, loadDiscoveredPuzzles } = this.props;
        loadDiscoveredPuzzles(huntKey);
    }

    public render() {
        const { discoveredPuzzles } = this.props;
        return (
            <div className="discovered-puzzles-container">
                <h3><em>discovered</em> puzzle pages</h3>
                { !isAsyncLoaded(discoveredPuzzles) ? "Loading..." : this.renderDiscoveredPuzzles() }
            </div>
        );
    }

    private renderDiscoveredPuzzles() {
        const discoveredPuzzles = this.props.discoveredPuzzles.value;
        const discoveredPuzzleRows = discoveredPuzzles
            .filter((discoveredPuzzle) => !discoveredPuzzle.ignored)
            .map((discoveredPuzzle) => {
                return (
                    <tr key={discoveredPuzzle.title}>
                        <td>{this.getRegexedTitle(discoveredPuzzle.title)}</td>
                        <td><button>generate slack & doc</button></td>
                        <td><button>ignore</button></td>
                        <td>
                            <input type="text" defaultValue={this.getPuzzleUrl(discoveredPuzzle.host, discoveredPuzzle.path)} />
                        </td>
                    </tr>
                )
            });
        return (
            <table cellPadding="0" cellSpacing="0">
                <tbody>
                    {discoveredPuzzleRows}
                </tbody>
            </table>
        );
    }

    private getPuzzleUrl(host: string, path: string) {
        return `http://${host}${path}`;
    }

    private getRegexedTitle(title: string) {
        const { titleRegex } = this.props;
        const matches = title.match(titleRegex);
        if (matches == null) {
            // didn't match regex
            return title;
        } else {
            return matches[0].trim();
        }
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    const { discoveredPuzzles } = state;
    return {
        discoveredPuzzles,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        loadDiscoveredPuzzles: loadDiscoveredPuzzlesAction,
    }, dispatch);
}

export const DiscoveredPuzzles = connect(mapStateToProps, mapDispatchToProps)(UnconnectedDiscoveredPuzzles);
