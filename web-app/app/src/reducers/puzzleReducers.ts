import {
    AsyncActionStatus,
    CREATE_PUZZLE_ACTION,
    getAsyncLoadedValue,
    IAsyncAction,
    IAsyncLoaded,
    isAsyncSucceeded,
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
        case CREATE_PUZZLE_ACTION:
            if (isAsyncSucceeded(action)) {
                let discoveredPages = state.value;
                // for now only create one puzzle at a time
                const createdPuzzlePage = action.value[0];
                discoveredPages = discoveredPages.filter((page) => page.key !== createdPuzzlePage.key);
                return Object.assign({}, state, { value: discoveredPages });
            }
        default:
            return state;
    }
}
