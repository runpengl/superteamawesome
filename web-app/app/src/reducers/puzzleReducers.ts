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
    ICreatePuzzleActionPayload,
} from "../actions";
import { IDiscoveredPage, IPuzzle } from "../state";

const puzzlesInitialState: IAsyncLoaded<IPuzzle[]> = {
    status: AsyncActionStatus.NONE,
};

export function puzzlesReducer(state: IAsyncLoaded<IPuzzle[]> = puzzlesInitialState,
    action: IAsyncAction<any>) {
    switch (action.type) {
        case LOAD_PUZZLES_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        case CREATE_PUZZLE_ACTION:
            if (isAsyncSucceeded(action)) {
                let payload = action.value as ICreatePuzzleActionPayload;
                let newPuzzles: IPuzzle[] = state.value.concat(payload.newPuzzles);
                newPuzzles[newPuzzles.length - 1].index = newPuzzles.length - 1;
                return Object.assign({}, state, { value: newPuzzles });
            }
        default: return state;
    }
}

const initialState: IAsyncLoaded<IDiscoveredPage[]> = {
    status: AsyncActionStatus.NONE,
}

export function discoveredPageReducer(state: IAsyncLoaded<IDiscoveredPage[]> = initialState,
    action: IAsyncAction<any>) {
    switch (action.type) {
        case LOAD_DISCOVERED_PUZZLES_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        case CREATE_PUZZLE_ACTION:
            if (isAsyncSucceeded(action)) {
                let discoveredPages = state.value;
                // for now only create one puzzle at a time
                let payload = action.value as ICreatePuzzleActionPayload;
                const createdPuzzlePage = payload.changedPages[0];
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
                const changedPagesValue = action.value as IDiscoveredPage[];
                let changedPages = changedPagesValue.filter((page) => !page.ignored);
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
    action: IAsyncAction<any>) {
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
                let changedPages = action.value as ICreatePuzzleActionPayload;
                const createdPuzzlePage = changedPages.changedPages[0];
                ignoredPages = ignoredPages.filter((page) => page.key !== createdPuzzlePage.key);
                return Object.assign({}, state, { value: ignoredPages });
            }
        case SAVE_DISCOVERED_PAGE_CHANGES_ACTION:
            if (isAsyncSucceeded(action)) {
                const changedPagesValue = action.value as IDiscoveredPage[];
                let changedPages = changedPagesValue.filter((page) => page.ignored);
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
