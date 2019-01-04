import { IHuntState } from "../state";
import { IAsyncLoaded, AsyncActionStatus, IAsyncAction, getAsyncLoadedValue, isAsyncSucceeded } from '../actions/loading';
import { LOAD_HUNT_ACTION, SAVE_HUNT_ACTION, SET_HUNT_DRIVE_FOLDER_ACTION } from '../actions/huntActions';
import { LOAD_SLACK_TEAM_ID_ACTION } from '../actions/slackActions';
import { LOGOUT_ACTION } from '../actions/authActions';

const initialState: IAsyncLoaded<IHuntState> = {
    status: AsyncActionStatus.NONE,
}

export function huntReducer(state: IAsyncLoaded<IHuntState> = initialState, action: IAsyncAction<IHuntState>) {
    switch (action.type) {
        case LOAD_HUNT_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        case SAVE_HUNT_ACTION:
            let savedValue = getAsyncLoadedValue(action);
            savedValue.value = Object.assign({}, state.value, savedValue.value);
            return Object.assign({}, state, savedValue);
        case SET_HUNT_DRIVE_FOLDER_ACTION:
            if (isAsyncSucceeded(action)) {
                let setValue = Object.assign({}, state.value, { driveFolderId: action.value });
                return Object.assign({}, state, { value: setValue });
            }
        case LOAD_SLACK_TEAM_ID_ACTION:
            if (isAsyncSucceeded(action)) {
                let setValue = Object.assign({}, state.value, { slackTeamId: action.value });
                return Object.assign({}, state, { value: setValue });
            }
        case LOGOUT_ACTION:
            if (isAsyncSucceeded(action)) {
                return initialState;
            }
        default:
            return state;
    }
}
