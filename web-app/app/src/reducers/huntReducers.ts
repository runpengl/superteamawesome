import {
    AsyncActionStatus,
    getAsyncLoadedValue,
    IAsyncAction,
    IAsyncLoaded,
    LOAD_HUNT_ACTION,
    SAVE_HUNT_ACTION,
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
            let value = getAsyncLoadedValue(action);
            value.value = Object.assign({}, state.value, value.value);
            return Object.assign({}, state, value);
        default:
            return state;
    }
}
