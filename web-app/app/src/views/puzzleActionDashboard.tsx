import * as React from "react";
import { connect, Dispatch } from "react-redux";
import { RouteComponentProps } from "react-router";
import { bindActionCreators } from "redux";
import { IDiscoveredPage } from "../../../server/api/puzzleApi";
import { loadHuntAndUserInfoAction } from "../store/actions/huntActions";
import { IAsyncLoaded, isAsyncInProgress, isAsyncLoaded } from "../store/actions/loading";
import { createPuzzleFromKeyAction, ignoreDiscoveredPageFromKey } from "../store/actions/puzzleActions";
import { IAppState, IHuntState } from "../store/state";
import { ViewContainer } from "./common/viewContainer";

interface IDispatchProps {
    loadHuntAndUserInfo: () => void;
    createPuzzle: (discoveredPageKey: string, huntKey: string) => void;
    ignoreDiscoveredPage: (discoveredPageKey: string, huntKey: string) => void;
}

interface IStateProps {
    createdSinglePuzzle: IAsyncLoaded<void>;
    ignoredPages: IAsyncLoaded<IDiscoveredPage[]>;
    hunt: IAsyncLoaded<IHuntState>;
}

interface IRouteProps {
    discoveredPageKey: string;
    actionType: "ignore" | "create";
}

type IPuzzleActionDashboardProps = IStateProps & IDispatchProps & RouteComponentProps<IRouteProps>;

class UnconnectedPuzzleActionDashboard extends React.PureComponent<IPuzzleActionDashboardProps> {
    public componentWillReceiveProps(nextProps: IPuzzleActionDashboardProps) {
        if (!isAsyncLoaded(this.props.hunt) && isAsyncLoaded(nextProps.hunt)) {
            if (nextProps.match.params.actionType === "ignore") {
                nextProps.ignoreDiscoveredPage(nextProps.match.params.discoveredPageKey, nextProps.hunt.value.year);
            } else {
                nextProps.createPuzzle(nextProps.match.params.discoveredPageKey, nextProps.hunt.value.year);
            }
        }

        if (nextProps.ignoredPages.value !== undefined && this.props.ignoredPages.value === undefined) {
            // it was ignored
            (window as any).location = "/admin";
        }

        if (isAsyncLoaded(nextProps.createdSinglePuzzle) && !isAsyncLoaded(this.props.createdSinglePuzzle)) {
            // it was created
            (window as any).location = "/admin";
        }
    }

    public render() {
        return (
            <ViewContainer
                onLoggedIn={this.handleLogIn}
                isContentReady={isAsyncLoaded(this.props.hunt) || isAsyncInProgress(this.props.hunt)}
            >
                {this.props.match.params.actionType === "ignore" ? "Ignoring puzzle..." : "Creating puzzle..."}
            </ViewContainer>
        );
    }

    private handleLogIn = () => {
        this.props.loadHuntAndUserInfo();
    };
}

function mapStateToProps(state: IAppState): IStateProps {
    return {
        createdSinglePuzzle: state.lifecycle.createdSinglePuzzle,
        ignoredPages: state.ignoredPages,
        hunt: state.activeHunt,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators(
        {
            loadHuntAndUserInfo: loadHuntAndUserInfoAction,
            createPuzzle: createPuzzleFromKeyAction,
            ignoreDiscoveredPage: ignoreDiscoveredPageFromKey,
        },
        dispatch,
    );
}

export const PuzzleActionDashboard = connect(
    mapStateToProps,
    mapDispatchToProps,
)(UnconnectedPuzzleActionDashboard);
