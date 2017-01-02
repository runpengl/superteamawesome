import {
    AsyncActionStatus,
    getAsyncLoadedValue,
    IAsyncAction,
    IAsyncLoaded,
    LOAD_DISCOVERED_PUZZLES_ACTION,
} from "../actions";
import { IDiscoveredPuzzle } from "../state";

const initialState: IAsyncLoaded<IDiscoveredPuzzle[]> = {
    status: AsyncActionStatus.NONE,
}

export function discoveredPuzzleReducer(state: IAsyncLoaded<IDiscoveredPuzzle[]> = initialState,
    action: IAsyncAction<IDiscoveredPuzzle[]>) {
    switch (action.type) {
        case LOAD_DISCOVERED_PUZZLES_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        default:
            return state;
    }
}
