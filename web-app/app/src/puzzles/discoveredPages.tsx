import * as React from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import { IAsyncLoaded, isAsyncLoaded, loadDiscoveredPagesAction } from "../actions";
import { IAppState, IDiscoveredPage } from "../state";

interface IOwnProps {
    huntKey: string;
    titleRegex: string;
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
        const { huntKey, loadDiscoveredPages } = this.props;
        loadDiscoveredPages(huntKey);
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
        const discoveredPages = this.props.discoveredPages.value;
        const discoveredPageRows = discoveredPages
            .filter((discoveredPage) => !discoveredPage.ignored)
            .map((discoveredPage) => {
                return (
                    <tr key={discoveredPage.title}>
                        <td>{this.getRegexedTitle(discoveredPage.title)}</td>
                        <td><button>generate slack & doc</button></td>
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
