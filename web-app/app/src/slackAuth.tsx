import * as React from "react";
import { InjectedRouter } from "react-router";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import { loadSlackTokenAction } from "./actions";
import { IAppState } from "./state";

interface IStateProps {
    slackToken: string;
}

interface IOwnProps {
    location?: { query?: { code: string } };
}

interface IDispatchProps {
    loadSlackToken: (code: string) => void;
}

export interface ISlackAuthProps extends IDispatchProps, IOwnProps, IStateProps {}

interface IRouterContext {
    router: InjectedRouter;
}

class UnconnectedSlackAuth extends React.Component<ISlackAuthProps, {}> {
    public context: IRouterContext;
    static contextTypes = {
        router: React.PropTypes.object.isRequired,
    };

    public componentDidMount() {
        this.props.loadSlackToken(this.props.location.query.code);
    }

    public componentDidUpdate(oldProps: ISlackAuthProps) {
        if (oldProps.slackToken === undefined && this.props.slackToken !== undefined) {
            this.context.router.push("/admin");
        }
    }

    public render() {
        return <div>Logging into Slack...</div>;
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    return {
        slackToken: state.auth.slackToken,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        loadSlackToken: loadSlackTokenAction,
    }, dispatch);
}

export const SlackAuth = connect(mapStateToProps, mapDispatchToProps)(UnconnectedSlackAuth);