import {
    AsyncActionStatus,
    getAsyncLoadedValue,
    IAsyncAction,
    IAsyncLoaded,
    isAsyncSucceeded,
    LOAD_HUNT_ACTION,
    SAVE_HUNT_ACTION,
    SET_HUNT_DRIVE_FOLDER_ACTION,
} from "../actions";
import { IHuntState } from "../state";

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
                const setValue = Object.assign({}, state.value, { driveFolderId: action.value });
                return Object.assign({}, state, { setValue });
            }
        default:
            return state;
    }
}
