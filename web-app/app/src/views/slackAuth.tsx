import * as React from "react";
import { connect } from "react-redux";
import { Redirect } from "react-router";
import { bindActionCreators, Dispatch } from "redux";

import { loadSlackTokenAction } from "../store/actions/slackActions";
import { IAppState } from "../store/state";

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

class UnconnectedSlackAuth extends React.Component<ISlackAuthProps, {}> {
    public componentDidMount() {
        this.props.loadSlackToken(this.props.location.query.code);
    }

    public render() {
        if (this.props.slackToken !== undefined) {
            return <Redirect to="/admin" />;
        }
        return <div>Logging into Slack...</div>;
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    return {
        slackToken: state.auth.slackToken,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators(
        {
            loadSlackToken: loadSlackTokenAction,
        },
        dispatch,
    );
}

export const SlackAuth = connect(
    mapStateToProps,
    mapDispatchToProps,
)(UnconnectedSlackAuth);
