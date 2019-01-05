import * as classNames from "classnames";
import { isEqual } from "lodash-es";
import * as React from "react";
import { connect, Dispatch } from "react-redux";
import { bindActionCreators } from "redux";
import {
    addNewHuntAction,
    IAddNewHuntActionPayload,
    loadAllHuntsAndUserInfo,
    saveHuntInfoAction,
} from "../store/actions/huntActions";
import { IAsyncLoaded, isAsyncInProgress, isAsyncLoaded } from "../store/actions/loading";
import { IAppState, IHuntState } from "../store/state";
import { ViewContainer } from "./common/viewContainer";

interface IStateProps {
    addingNewHunt: IAsyncLoaded<void>;
    savingHuntInfo: IAsyncLoaded<void>;
    hunts: IAsyncLoaded<{ [key: string]: IHuntState }>;
}

interface IDispatchProps {
    loadHuntsAndAuthInfo: () => void;
    addNewHunt: (newHunt: IAddNewHuntActionPayload) => void;
    saveHunt: (hunt: IHuntState, huntId: string) => void;
}

interface IAllHuntsDashboardState {
    activeHuntId: string | undefined;
    activeHunt: IHuntState | undefined;
}

export type IAllHuntsDashboardProps = IStateProps & IDispatchProps;

class UnconnectedAllHuntsDashboard extends React.PureComponent<IAllHuntsDashboardProps, IAllHuntsDashboardState> {
    public state: IAllHuntsDashboardState = {
        activeHuntId: undefined,
        activeHunt: undefined,
    };

    public componentWillReceiveProps(nextProps: IAllHuntsDashboardProps) {
        if (
            isAsyncLoaded(nextProps.hunts) &&
            !isAsyncLoaded(this.props.hunts) &&
            Object.keys(nextProps.hunts.value).length > 0
        ) {
            const currentHunt = Object.keys(nextProps.hunts.value).find(
                huntKey => nextProps.hunts.value[huntKey].isCurrent,
            );
            this.setState({ activeHuntId: currentHunt, activeHunt: nextProps.hunts.value[currentHunt] });
        }
    }

    public render() {
        return (
            <ViewContainer
                onLoggedIn={this.props.loadHuntsAndAuthInfo}
                isContentReady={isAsyncLoaded(this.props.hunts)}
            >
                {this.maybeRenderAllHunts()}
            </ViewContainer>
        );
    }

    private maybeRenderAllHunts() {
        if (isAsyncLoaded(this.props.hunts)) {
            return (
                <div className="hunt-dashboard">
                    {this.renderHuntNavigation()}
                    {this.maybeRenderHunt()}
                </div>
            );
        } else {
            return "Loading...";
        }
    }

    private renderHuntNavigation() {
        return (
            <div className="hunt-dashboard-navigation">
                {Object.keys(this.props.hunts.value)
                    .sort()
                    .reverse()
                    .map(huntKey => (
                        <div
                            className={classNames("hunt", { active: huntKey === this.state.activeHuntId })}
                            key={huntKey}
                            onClick={this.getHuntKeyClickHandler(huntKey)}
                        >
                            {huntKey}
                        </div>
                    ))}
                <div className="add-new-hunt" onClick={this.handleAddNewHunt}>
                    + Add new hunt
                </div>
            </div>
        );
    }

    private maybeRenderHunt() {
        const { activeHuntId, activeHunt } = this.state;
        if (activeHunt !== undefined) {
            return (
                <div className="hunt-editor">
                    <div className="hunt-editor-row">
                        <label>ID</label>
                        <input
                            disabled={
                                !isAsyncLoaded(this.props.hunts) || this.props.hunts.value[activeHuntId] !== undefined
                            }
                            type="text"
                            value={activeHuntId}
                            onChange={this.handleHuntIdChange}
                        />
                    </div>
                    <div className="hunt-editor-row">
                        <label>Hunt name</label>
                        <input type="text" value={activeHunt.name} name="name" onChange={this.handleHuntDetailChange} />
                    </div>
                    <div className="hunt-editor-row">
                        <label>Domain name</label>
                        <input
                            type="text"
                            value={activeHunt.domain}
                            name="domain"
                            onChange={this.handleHuntDetailChange}
                        />
                    </div>
                    <div className="hunt-editor-row">
                        <label>Title match regex</label>
                        <input
                            type="text"
                            value={activeHunt.titleRegex}
                            name="titleRegex"
                            onChange={this.handleHuntDetailChange}
                        />
                    </div>
                    <div className="hunt-editor-row">
                        <label>Google drive folder</label>
                        <input
                            type="text"
                            value={this.getHuntFolderLink()}
                            onChange={this.handleHuntDriveFolderChange}
                        />
                    </div>
                    <div className="hunt-editor-row">
                        <label>Spreadsheet template</label>
                        <input
                            type="text"
                            value={this.getTemplateSheetLink()}
                            onChange={this.handleTemplateSheetChange}
                        />
                    </div>
                    <div className="hunt-editor-row checkbox-row">
                        <label>
                            <input
                                type="checkbox"
                                checked={activeHunt.isCurrent}
                                onChange={this.handleIsActiveChange}
                            />
                            Active hunt
                        </label>
                    </div>
                    <button
                        className={classNames("save-button", {
                            disabled: isEqual(activeHunt, this.props.hunts.value[activeHuntId]),
                        })}
                        onClick={this.handleSave}
                    >
                        {this.getButtonText()}
                    </button>
                </div>
            );
        } else {
            return "Select a hunt";
        }
    }

    private getButtonText() {
        if (this.props.hunts.value[this.state.activeHuntId] === undefined) {
            if (isAsyncInProgress(this.props.addingNewHunt)) {
                return "Adding new hunt...";
            }
            return "Add new hunt";
        } else {
            if (isAsyncInProgress(this.props.savingHuntInfo)) {
                return "Saving changes...";
            }
            return "Save changes";
        }
    }

    private getTemplateSheetLink() {
        const { activeHunt } = this.state;
        if (activeHunt === undefined || activeHunt.templateSheetId === undefined) {
            return "";
        } else {
            return `https://docs.google.com/spreadsheets/d/${activeHunt.templateSheetId}/edit`;
        }
    }

    private getHuntFolderLink() {
        const { activeHunt } = this.state;
        if (activeHunt === undefined || activeHunt.driveFolderId === undefined) {
            return "";
        } else {
            return `https://drive.google.com/drive/folders/${activeHunt.driveFolderId}`;
        }
    }

    private getHuntKeyClickHandler(huntKey: string) {
        return () => this.setState({ activeHuntId: huntKey, activeHunt: this.props.hunts.value[huntKey] });
    }

    private handleHuntDriveFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        const folderIdRegex = new RegExp(/https:\/\/drive.google.com\/drive\/(u\/\d\/)?folders\/(.+)$/g);
        const matches = folderIdRegex.exec(newValue);
        if (matches != null && matches.length > 2 && matches[2] !== this.state.activeHunt.driveFolderId) {
            this.setState({
                activeHunt: { ...this.state.activeHunt, driveFolderId: matches[2] },
            });
        }
    };

    private handleTemplateSheetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        const sheetIdRegex = new RegExp(/https:\/\/docs.google.com\/spreadsheets\/d\/(.+)\/.+/g);
        const matches = sheetIdRegex.exec(newValue);
        if (matches.length > 1 && matches[1] !== this.state.activeHunt.templateSheetId) {
            this.setState({
                activeHunt: {
                    ...this.state.activeHunt,
                    templateSheetId: matches[1],
                },
            });
        }
    };

    private handleIsActiveChange = () =>
        this.setState({ activeHunt: { ...this.state.activeHunt, isCurrent: !this.state.activeHunt.isCurrent } });

    private handleAddNewHunt = () => {
        this.setState({
            activeHuntId: "",
            activeHunt: {
                domain: "",
                year: `${new Date().getFullYear()}`,
                name: "",
                isCurrent: true,
                titleRegex: "[^-]*",
            },
        });
    };

    private handleHuntIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!isAsyncLoaded(this.props.hunts) || this.props.hunts.value[event.target.value] === undefined) {
            this.setState({ activeHuntId: event.target.value });
        }
    };

    private handleHuntDetailChange = (event: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({
            activeHunt: {
                ...this.state.activeHunt,
                [event.target.name]: event.target.value,
            },
        });

    private handleSave = () => {
        if (this.props.hunts.value[this.state.activeHuntId] === undefined) {
            this.props.addNewHunt({
                ...this.state.activeHunt,
                huntId: this.state.activeHuntId,
            });
        } else {
            this.props.saveHunt(this.state.activeHunt, this.state.activeHuntId);
        }
    };
}

function mapStateToProps(state: IAppState): IStateProps {
    return {
        addingNewHunt: state.lifecycle.addingNewHunt,
        savingHuntInfo: state.lifecycle.savingHuntInfo,
        hunts: state.hunts,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators(
        {
            loadHuntsAndAuthInfo: loadAllHuntsAndUserInfo,
            addNewHunt: addNewHuntAction,
            saveHunt: saveHuntInfoAction,
        },
        dispatch,
    );
}

export const AllHuntsDashboard = connect(
    mapStateToProps,
    mapDispatchToProps,
)(UnconnectedAllHuntsDashboard);
