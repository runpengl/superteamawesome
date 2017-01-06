import {
    AsyncActionStatus,
    CREATE_PUZZLE_ACTION,
    IGNORE_DISCOVERED_PAGE_ACTION,
    getAsyncLoadedValue,
    IAsyncAction,
    IAsyncLoaded,
    isAsyncSucceeded,
    LOAD_DISCOVERED_PUZZLES_ACTION,
    LOAD_IGNORED_PAGES_ACTION,
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
        case IGNORE_DISCOVERED_PAGE_ACTION:
            if (isAsyncSucceeded(action)) {
                let discoveredPages = state.value;
                const ignoredPuzzlePage = action.value[0];
                discoveredPages = discoveredPages.filter((page) => page.key !== ignoredPuzzlePage.key);
                return Object.assign({}, state, { value: discoveredPages });
            }
        default:
            return state;
    }
}

export function ignoredPagesReducer(state: IAsyncLoaded<IDiscoveredPage[]> = initialState,
    action: IAsyncAction<IDiscoveredPage[]>) {
    switch (action.type) {
        case LOAD_IGNORED_PAGES_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        case IGNORE_DISCOVERED_PAGE_ACTION:
            if (isAsyncSucceeded(action)) {
                return Object.assign({}, state, { value: state.value.concat(action.value) });
            }
        case CREATE_PUZZLE_ACTION:
            if (isAsyncSucceeded(action)) {
                let ignoredPages = state.value;
                // for now only create one puzzle at a time
                const createdPuzzlePage = action.value[0];
                ignoredPages = ignoredPages.filter((page) => page.key !== createdPuzzlePage.key);
                return Object.assign({}, state, { value: ignoredPages });
            }
        default:
            return state;
    }
}
