import {
    AsyncActionStatus,
    getAsyncLoadedValue,
    IAsyncAction,
    IAsyncLoaded,
    LOAD_DISCOVERED_PUZZLES_ACTION,
} from "../actions";
import { IDiscoveredPage } from "../state";

const initialState: IAsyncLoaded<IDiscoveredPage[]> = {
    status: AsyncActionStatus.NONE,
}

export function discoveredPageReducer(state: IAsyncLoaded<IDiscoveredPage[]> = initialState,
    action: IAsyncAction<IDiscoveredPage[]>) {
    switch (action.type) {
        case LOAD_DISCOVERED_PUZZLES_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        default:
            return state;
    }
}
