import * as classnames from "classnames";
import * as React from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import { IAsyncLoaded, isAsyncLoaded } from "../store/actions/loading";
import {
    createPuzzleAction,
    ignoreDiscoveredPageAction,
    IPuzzleInfoChanges,
    saveDiscoveredPageChangesAction,
} from "../store/actions/puzzleActions";
import { IAppLifecycle, IAppState, IDiscoveredPage, IHuntState } from "../store/state";

interface IOwnProps {
    hunt: IHuntState;
    isInitallyCollapsed?: boolean;
    discoveredPages: IAsyncLoaded<IDiscoveredPage[]>;
    hideIgnoreButton?: boolean;
    title: string;
}

interface IDispatchProps {
    createPuzzle?: (puzzleName: string, discoveredPage: IDiscoveredPage) => void;
    ignoreDiscoveredPage?: (discoveredPage: IDiscoveredPage) => void;
    saveDiscoveredPageChanges?: (changedPages: { [key: string]: IPuzzleInfoChanges }) => void;
}

interface IStateProps {
    lifecycle?: IAppLifecycle;
}
interface IDiscoveredPagesProps extends IOwnProps, IDispatchProps, IStateProps {}

interface IDiscoveredPagesState {
    error?: string;
    generatingPuzzles?: string[];
    hasChanges: boolean;
    isCollapsed?: boolean;
    updatedPages?: { [key: string]: IPuzzleInfoChanges };
}

class UnconnectedDiscoveredPages extends React.Component<IDiscoveredPagesProps, IDiscoveredPagesState> {
    public state: IDiscoveredPagesState = {
        generatingPuzzles: [],
        hasChanges: false,
        isCollapsed: false,
        updatedPages: {},
    };

    public componentWillReceiveProps(props: IDiscoveredPagesProps) {
        this.setState({ hasChanges: false, isCollapsed: props.isInitallyCollapsed });
    }

    public componentDidUpdate(oldProps: IDiscoveredPagesProps) {
        const { lifecycle, discoveredPages } = this.props;
        if (
            isAsyncLoaded(oldProps.discoveredPages) &&
            isAsyncLoaded(discoveredPages) &&
            oldProps.discoveredPages.value.length !== discoveredPages.value.length
        ) {
            const newPageKeys = discoveredPages.value.map(page => page.key);
            const oldPageKeys = oldProps.discoveredPages.value.map(page => page.key);
            const removedPageKeys = oldPageKeys.filter(oldPageKey => {
                return newPageKeys.indexOf(oldPageKey) < 0;
            });
            let { generatingPuzzles } = this.state;
            removedPageKeys.forEach(key => {
                const removeIndex = generatingPuzzles.findIndex(puzzleKey => puzzleKey === key);
                generatingPuzzles = generatingPuzzles.splice(removeIndex, 1);
            });
            this.setState({ generatingPuzzles, hasChanges: false });
        }

        if (oldProps.lifecycle.createPuzzleFailure === undefined && lifecycle.createPuzzleFailure !== undefined) {
            this.setState({
                error: lifecycle.createPuzzleFailure.message,
                generatingPuzzles: [],
                hasChanges: false,
            });
        }
    }

    public render() {
        const { discoveredPages, title } = this.props;
        const { error, hasChanges, isCollapsed } = this.state;
        let pages: JSX.Element;
        if (!isCollapsed) {
            pages = (
                <div className="table-wrapper">
                    <div className="table-container">
                        {!isAsyncLoaded(discoveredPages) ? "Loading..." : this.renderDiscoveredPages()}
                    </div>
                    <button
                        className="discovered-puzzles-save-button"
                        disabled={!hasChanges}
                        onClick={this.handleSaveChanges}
                    >
                        {hasChanges ? "Save" : "Saved"}
                    </button>
                </div>
            );
        }
        return (
            <div className="discovered-puzzles-container">
                <div className="discovered-puzzles-header" onClick={this.toggleCollapsed}>
                    <span className={classnames({ collapsed: isCollapsed, uncollapsed: !isCollapsed })} />
                    <h3>
                        <em>{title}</em> puzzle pages
                    </h3>
                </div>
                {error !== undefined ? `There was an error creating the puzzle: ${error}` : undefined}
                {pages}
            </div>
        );
    }

    private toggleCollapsed = () => {
        this.setState({ hasChanges: this.state.hasChanges, isCollapsed: !this.state.isCollapsed });
    };

    private renderDiscoveredPages() {
        const { hunt } = this.props;
        const { generatingPuzzles } = this.state;
        const discoveredPages = this.props.discoveredPages.value;
        const discoveredPageRows = discoveredPages.map(discoveredPage => {
            const title = this.getRegexedTitle(discoveredPage.title);
            return (
                <tr key={discoveredPage.key}>
                    <td>
                        <input type="text" defaultValue={title} onChange={this.handlePageTitleChange(discoveredPage)} />
                    </td>
                    <td>
                        <button
                            className="generate-slack-doc-button"
                            disabled={hunt.driveFolderId === undefined || hunt.templateSheetId === undefined}
                            onClick={this.handleCreatePuzzle(title, discoveredPage)}
                        >
                            {generatingPuzzles.indexOf(discoveredPage.key) >= 0
                                ? "generating..."
                                : "generate slack & doc"}
                        </button>
                    </td>
                    {this.maybeRenderIgnoreButton(discoveredPage)}
                    <td>
                        <input
                            type="text"
                            defaultValue={this.getPuzzleUrl(discoveredPage.host, discoveredPage.path)}
                            onChange={this.handlePageLinkChange(discoveredPage)}
                        />
                    </td>
                </tr>
            );
        });
        return (
            <table cellPadding="0" cellSpacing="0">
                <tbody>{discoveredPageRows}</tbody>
            </table>
        );
    }

    private handlePageLinkChange = (discoveredPage: IDiscoveredPage) => {
        return (event: React.FormEvent<HTMLInputElement>) => {
            const newValue = (event.target as HTMLInputElement).value;
            const newUpdatedPages = { ...this.state.updatedPages };
            if (newUpdatedPages[discoveredPage.key] === undefined) {
                newUpdatedPages[discoveredPage.key] = {};
            }
            newUpdatedPages[discoveredPage.key].link = newValue;
            this.setState({ hasChanges: true, updatedPages: newUpdatedPages });
        };
    };

    private handlePageTitleChange = (discoveredPage: IDiscoveredPage) => {
        return (event: React.FormEvent<HTMLInputElement>) => {
            const newValue = (event.target as HTMLInputElement).value;
            const newUpdatedPages = { ...this.state.updatedPages };
            if (newUpdatedPages[discoveredPage.key] === undefined) {
                newUpdatedPages[discoveredPage.key] = {};
            }
            newUpdatedPages[discoveredPage.key].title = newValue;
            this.setState({ hasChanges: true, updatedPages: newUpdatedPages });
        };
    };

    private maybeRenderIgnoreButton(discoveredPage: IDiscoveredPage) {
        const { hideIgnoreButton } = this.props;
        if (!hideIgnoreButton) {
            return (
                <td>
                    <button className="ignore-button" onClick={this.handleIgnorePage(discoveredPage)}>
                        ignore
                    </button>
                </td>
            );
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

    private handleSaveChanges = () => {
        const { saveDiscoveredPageChanges } = this.props;
        const { hasChanges, updatedPages } = this.state;
        if (hasChanges) {
            saveDiscoveredPageChanges(updatedPages);
            this.setState({ hasChanges: false });
        }
    };

    private handleCreatePuzzle = (title: string, discoveredPage: IDiscoveredPage) => {
        const { createPuzzle } = this.props;
        return () => {
            createPuzzle(title, discoveredPage);
            this.setState({
                hasChanges: this.state.hasChanges,
                generatingPuzzles: this.state.generatingPuzzles.concat(discoveredPage.key),
            });
        };
    };

    private handleIgnorePage = (discoveredPage: IDiscoveredPage) => {
        const { ignoreDiscoveredPage } = this.props;
        return () => {
            ignoreDiscoveredPage(discoveredPage);
        };
    };
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    return { lifecycle: state.lifecycle };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators(
        {
            createPuzzle: createPuzzleAction,
            ignoreDiscoveredPage: ignoreDiscoveredPageAction,
            saveDiscoveredPageChanges: saveDiscoveredPageChangesAction,
        },
        dispatch,
    );
}

export const DiscoveredPages = connect(
    mapStateToProps,
    mapDispatchToProps,
)(UnconnectedDiscoveredPages);
