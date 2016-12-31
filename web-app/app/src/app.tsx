import * as React from "react";
import * as ReactDOM from "react-dom";
import { connect, Provider } from 'react-redux'
import { combineReducers, createStore, Dispatch } from 'redux'
import * as firebase from "firebase";

import { IAppState } from "./state";
import Button from "./components/button";

interface IStateProps {
    googleToken?: string;
    user?: firebase.UserInfo;
}

interface IOwnProps {}
interface IDispatchProps {}

interface IAppProps extends IStateProps, IOwnProps, IDispatchProps {}

class UnconnectedApp extends React.Component<IAppProps, {}> {
    public render() {
        const { user } = this.props;
        if (user !== undefined) {
            return (
                <div>
                    <Button>hi there</Button>
                </div>
            );
        } else {
            return <span>Login please</span>;
        }
    }
}

function mapStateToProps(state: IAppState): IStateProps {
    const { googleToken, user } = state;
    return {
        googleToken,
        user,
    };
}

function mapDispatchToProps(_dispatch: Dispatch<IDispatchProps>) {
    return {};
}

const App = connect(mapStateToProps, mapDispatchToProps)(UnconnectedApp);

// todo: move reducers to reducers folder
const store = createStore(combineReducers({}));

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.querySelector("#app")
);
