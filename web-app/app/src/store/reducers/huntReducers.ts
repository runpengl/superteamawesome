import { LOGOUT_ACTION } from "../actions/authActions";
import { LOAD_HUNT_ACTION, SAVE_HUNT_ACTION, SET_HUNT_DRIVE_FOLDER_ACTION } from "../actions/huntActions";
import {
    AsyncActionStatus,
    getAsyncLoadedValue,
    IAsyncAction,
    IAsyncLoaded,
    isAsyncSucceeded,
} from "../actions/loading";
import { LOAD_SLACK_TEAM_ID_ACTION } from "../actions/slackActions";
import { IHuntState } from "../state";

const initialState: IAsyncLoaded<IHuntState> = {
    status: AsyncActionStatus.NONE,
};

export function huntReducer(state: IAsyncLoaded<IHuntState> = initialState, action: IAsyncAction<IHuntState>) {
    switch (action.type) {
        case LOAD_HUNT_ACTION:
            return { ...state, ...getAsyncLoadedValue(action) };
        case SAVE_HUNT_ACTION:
            const savedValue = getAsyncLoadedValue(action);
            savedValue.value = { ...state.value, ...savedValue.value };
            return { ...state, ...savedValue };
        case SET_HUNT_DRIVE_FOLDER_ACTION:
            if (isAsyncSucceeded(action)) {
                const setValue = { ...state.value, driveFolderId: action.value };
                return { ...state, value: setValue };
            }
        case LOAD_SLACK_TEAM_ID_ACTION:
            if (isAsyncSucceeded(action)) {
                const setValue = { ...state.value, slackTeamId: action.value };
                return { ...state, value: setValue };
            }
        case LOGOUT_ACTION:
            if (isAsyncSucceeded(action)) {
                return initialState;
            }
        default:
            return state;
    }
}
