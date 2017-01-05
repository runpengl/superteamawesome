import * as React from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import { IAsyncLoaded, isAsyncLoaded, loadDiscoveredPagesAction } from "../actions";
import { IAppState, IHuntState, IDiscoveredPage } from "../state";

interface IOwnProps {
    hunt: IHuntState;
}

interface IDispatchProps {
    loadDiscoveredPages?: (huntKey: string) => void;
}

interface IStateProps {
    discoveredPages?: IAsyncLoaded<IDiscoveredPage[]>;
}
interface IDiscoveredPagesProps extends IOwnProps, IDispatchProps, IStateProps {}

class UnconnectedDiscoveredPages extends React.Component<IDiscoveredPagesProps, {}> {
    public componentDidMount() {
        const { hunt, loadDiscoveredPages } = this.props;
        loadDiscoveredPages(hunt.year);
    }

    public render() {
        const { discoveredPages } = this.props;
        return (
            <div className="discovered-puzzles-container">
                <h3><em>discovered</em> puzzle pages</h3>
                { !isAsyncLoaded(discoveredPages) ? "Loading..." : this.renderDiscoveredPages() }
            </div>
        );
    }

    private renderDiscoveredPages() {
        const { hunt } = this.props;
        const discoveredPages = this.props.discoveredPages.value;
        const discoveredPageRows = discoveredPages
            .filter((discoveredPage) => !discoveredPage.ignored)
            .map((discoveredPage) => {
                const title = this.getRegexedTitle(discoveredPage.title);
                return (
                    <tr key={discoveredPage.title}>
                        <td>{title}</td>
                        <td>
                            <button
                                disabled={hunt.driveFolderId === undefined || hunt.templateSheetId === undefined}
                                onClick={this.handleCreatePuzzle(title)}
                            >
                                generate slack & doc
                            </button>
                        </td>
                        <td><button>ignore</button></td>
                        <td>
                            <input type="text" defaultValue={this.getPuzzleUrl(discoveredPage.host, discoveredPage.path)} />
                        </td>
                    </tr>
                )
            });
        return (
            <table cellPadding="0" cellSpacing="0">
                <tbody>
                    {discoveredPageRows}
                </tbody>
            </table>
        );
    }

    private getPuzzleUrl(host: string, path: string) {
        return `http://${host}${path}`;
    }

    private getRegexedTitle(title: string) {
        const { hunt } = this.props;
        const matches = title.match(hunt.titleRegex);
        if (matches == null) {
            // didn't match regex
            return title;
        } else {
            return matches[0].trim();
        }
    }

    private handleCreatePuzzle = (_title: string) => {
        // const { hunt } = this.props;
        return () => {
        //     // createSheet(hunt.templateSheetId, hunt.driveFolderId, title);
        };
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    const { discoveredPages } = state;
    return {
        discoveredPages,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        loadDiscoveredPages: loadDiscoveredPagesAction,
    }, dispatch);
}

export const DiscoveredPages = connect(mapStateToProps, mapDispatchToProps)(UnconnectedDiscoveredPages);
