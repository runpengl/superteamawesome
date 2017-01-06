import * as React from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import {
    createPuzzleAction,
    IAsyncLoaded,
    ignoreDiscoveredPageAction,
    isAsyncLoaded,
} from "../actions";
import { IAppState, IHuntState, IDiscoveredPage } from "../state";

interface IOwnProps {
    hunt: IHuntState;
    discoveredPages: IAsyncLoaded<IDiscoveredPage[]>;
    hideIgnoreButton?: boolean;
    title: string;
}

interface IDispatchProps {
    createPuzzle?: (puzzleName: string, discoveredPage: IDiscoveredPage) => void;
    ignoreDiscoveredPage?: (discoveredPage: IDiscoveredPage) => void;
}

interface IStateProps {}
interface IDiscoveredPagesProps extends IOwnProps, IDispatchProps, IStateProps {}

interface IDiscoveredPagesState {
    generatingPuzzles?: string[];
}

class UnconnectedDiscoveredPages extends React.Component<IDiscoveredPagesProps, IDiscoveredPagesState> {
    public state: IDiscoveredPagesState = {
        generatingPuzzles: [],
    };
    
    public componentDidUpdate(oldProps: IDiscoveredPagesProps) {
        const { discoveredPages } = this.props;
        if (isAsyncLoaded(oldProps.discoveredPages) && isAsyncLoaded(discoveredPages)
            && oldProps.discoveredPages.value.length !== discoveredPages.value.length) {
            const newPageKeys = discoveredPages.value.map((page) => page.key);
            const oldPageKeys = oldProps.discoveredPages.value.map((page) => page.key);
            const removedPageKeys = oldPageKeys.filter((oldPageKey) => {
                return newPageKeys.indexOf(oldPageKey) < 0;
            });
            let { generatingPuzzles } = this.state;
            removedPageKeys.forEach((key) => {
                const removeIndex = generatingPuzzles.findIndex((puzzleKey) => puzzleKey === key);
                generatingPuzzles = generatingPuzzles.splice(removeIndex, 1);
            });
            this.setState({ generatingPuzzles });
        }
    }

    public render() {
        const { discoveredPages, title } = this.props;
        return (
            <div className="discovered-puzzles-container">
                <h3><em>{title}</em> puzzle pages</h3>
                { !isAsyncLoaded(discoveredPages) ? "Loading..." : this.renderDiscoveredPages() }
            </div>
        );
    }

    private renderDiscoveredPages() {
        const { hunt } = this.props;
        const { generatingPuzzles } = this.state;
        const discoveredPages = this.props.discoveredPages.value;
        const discoveredPageRows = discoveredPages
            .map((discoveredPage) => {
                const title = this.getRegexedTitle(discoveredPage.title);
                return (
                    <tr key={discoveredPage.title}>
                        <td>{title}</td>
                        <td>
                            <button
                                disabled={hunt.driveFolderId === undefined || hunt.templateSheetId === undefined}
                                onClick={this.handleCreatePuzzle(title, discoveredPage)}
                            >
                                { generatingPuzzles.indexOf(discoveredPage.key) >= 0 ? "generating..." : "generate slack & doc" }
                            </button>
                        </td>
                        {this.maybeRenderIgnoreButton(discoveredPage)}
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

    private maybeRenderIgnoreButton(discoveredPage: IDiscoveredPage) {
        const { hideIgnoreButton } = this.props;
        if (!hideIgnoreButton) {
            return <td><button onClick={this.handleIgnorePage(discoveredPage)}>ignore</button></td>;
        }
        return undefined;
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

    private handleCreatePuzzle = (title: string, discoveredPage: IDiscoveredPage) => {
        const { createPuzzle } = this.props;
        return () => {
            createPuzzle(title, discoveredPage);
            this.setState({ generatingPuzzles: this.state.generatingPuzzles.concat(discoveredPage.key) });
        };
    }

    private handleIgnorePage = (discoveredPage: IDiscoveredPage) => {
        const { ignoreDiscoveredPage } = this.props;
        return () => {
            ignoreDiscoveredPage(discoveredPage);
        }
    }
}

function mapStateToProps(): IStateProps {
    return { };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        createPuzzle: createPuzzleAction,
        ignoreDiscoveredPage: ignoreDiscoveredPageAction,
    }, dispatch);
}

export const DiscoveredPages = connect(mapStateToProps, mapDispatchToProps)(UnconnectedDiscoveredPages);
