import * as React from "react";
import { IRouter } from "react-router";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import { IAsyncLoaded, isAsyncLoaded, loadHuntAndUserInfoAction, saveHuntInfoAction } from "./actions";
import { firebaseAuth } from "./auth";
import { DiscoveredPuzzles } from "./puzzles";
import { IAppState, IHuntState } from "./state";

interface IAdminDashboardState {
    hasChanges?: boolean;
    hunt?: IHuntState;
    isLoading?: boolean;
    loggedIn?: boolean;
}

interface IRouterContext {
    router: IRouter;
}

interface IOwnProps {}
interface IDispatchProps {
    loadHuntAndUserInfo: () => void;
    saveHuntInfo: (hunt: IHuntState) => void;
}

interface IStateProps {
    hunt: IAsyncLoaded<IHuntState>;
}

interface IAdminDashboardProps extends IOwnProps, IDispatchProps, IStateProps {}

class UnconnectedAdminDashboard extends React.Component<IAdminDashboardProps, IAdminDashboardState> {
    public state: IAdminDashboardState = {
        isLoading: true,
        loggedIn: false,
    };

    public context: IRouterContext;
    static contextTypes = {
        router: React.PropTypes.object.isRequired,
    };

    public componentDidMount() {
        const { loadHuntAndUserInfo } = this.props;
        firebaseAuth().onAuthStateChanged((user: firebase.UserInfo) => {
            if (user == null) {
                this.context.router.push("/login");
            } else {
                this.setState({
                    loggedIn: true,
                });
                loadHuntAndUserInfo();
            }
        });
    }

    public componentDidUpdate(oldProps: IAdminDashboardProps) {
        if (!isAsyncLoaded(oldProps.hunt) && isAsyncLoaded(this.props.hunt)) {
            const hunt = this.props.hunt.value;
            this.setState({
                hunt,
                isLoading: false,
            });
        }
    }

    public render() {
        if (this.state.isLoading) {
            return <span>Loading...</span>;
        } else {
            if (this.state.loggedIn) {
                return this.renderDashboard();
            } else {
                // shouldn't get here
                return <span>Please login</span>;
            }
        }
    }

    private handleHuntDomainChange = (event: React.FormEvent) => {
        const newValue = (event.target as HTMLInputElement).value;
        if (newValue !== this.props.hunt.value.domain) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { domain: newValue }),
            });
        }
    }

    private handleHuntNameChange = (event: React.FormEvent) => {
        const newValue = (event.target as HTMLInputElement).value;
        if (newValue !== this.props.hunt.value.name) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { name: newValue }),
            });
        }
    }

    private handleHuntTitleRegexChange = (event: React.FormEvent) => {
        const newValue = (event.target as HTMLInputElement).value;
        if (newValue !== this.props.hunt.value.titleRegex) {
            this.setState({
                hasChanges: true,
                hunt: Object.assign({}, this.state.hunt, { titleRegex: newValue }),
            });
        }
    }

    private handleSave = () => {
        this.props.saveHuntInfo(this.state.hunt);
        this.setState({ hasChanges: false });
    }

    private renderDashboard() {
        const hunt = this.props.hunt.value;
        return (
            <div className="dashboard">
                <div className="header">
                    <h1>STAPH [ADMIN]</h1>
                    <div className="sub-header">Super Team Awesome Puzzle Helper</div>
                </div>
                <div className="hunt-edit-container">
                    <div className="hunt-information">
                        <div className="edit-info-line">
                            <label>Hunt Name</label>
                            <input type="text" defaultValue={hunt.name} onChange={this.handleHuntNameChange} />
                        </div>
                        <div className="edit-info-line">
                            <label>url to match</label>
                            <input type="text" defaultValue={hunt.domain} onChange={this.handleHuntDomainChange} />
                        </div>
                        <div className="edit-info-line">
                            <label>match title</label>
                            <input type="text" defaultValue={hunt.titleRegex} onChange={this.handleHuntTitleRegexChange} />
                        </div>
                    </div>
                    <button disabled={!this.state.hasChanges} onClick={this.handleSave}>{ this.state.hasChanges ? "Save" : "Saved" }</button>
                </div>
                <DiscoveredPuzzles huntKey={hunt.year} titleRegex={hunt.titleRegex} />
            </div>
        )
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    const { hunt } = state;
    return {
        hunt,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators({
        loadHuntAndUserInfo: loadHuntAndUserInfoAction,
        saveHuntInfo: saveHuntInfoAction,
    }, dispatch);
}

export const AdminDashboard = connect(mapStateToProps, mapDispatchToProps)(UnconnectedAdminDashboard);