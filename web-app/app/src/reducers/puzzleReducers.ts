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
    LOAD_PUZZLES_ACTION,
    SAVE_DISCOVERED_PAGE_CHANGES_ACTION,
} from "../actions";
import { IDiscoveredPage, IPuzzle } from "../state";

const puzzlesInitialState: IAsyncLoaded<IPuzzle[]> = {
    status: AsyncActionStatus.NONE,
};

export function puzzlesReducer(state: IAsyncLoaded<IPuzzle[]> = puzzlesInitialState,
    action: IAsyncAction<IPuzzle[]>) {
    switch (action.type) {
        case LOAD_PUZZLES_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        default: return state;
    }
}

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
        case SAVE_DISCOVERED_PAGE_CHANGES_ACTION:
            if (isAsyncSucceeded(action)) {
                let changedPages = action.value.filter((page) => !page.ignored);
                let discoveredPages = state.value.slice();
                changedPages.forEach((changedPage) => {
                    const changedIndex = discoveredPages.findIndex((page) => page.key === changedPage.key);
                    discoveredPages[changedIndex] = changedPage;
                });
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
        case SAVE_DISCOVERED_PAGE_CHANGES_ACTION:
            if (isAsyncSucceeded(action)) {
                let changedPages = action.value.filter((page) => page.ignored);
                let discoveredPages = state.value.slice();
                changedPages.forEach((changedPage) => {
                    const changedIndex = discoveredPages.findIndex((page) => page.key === changedPage.key);
                    discoveredPages[changedIndex] = changedPage;
                });
                return Object.assign({}, state, { value: discoveredPages });
            }
        default:
            return state;
    }
}
