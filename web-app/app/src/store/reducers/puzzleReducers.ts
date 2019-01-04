import { IDiscoveredPage, IPuzzle } from "../state";
import { TOGGLE_META_ACTION, LOAD_PUZZLES_ACTION, ASSIGN_TO_META, LOAD_DISCOVERED_PUZZLES_ACTION, LOAD_IGNORED_PAGES_ACTION, IGNORE_DISCOVERED_PAGE_ACTION, CREATE_PUZZLE_ACTION, ICreatePuzzleActionPayload, SAVE_DISCOVERED_PAGE_CHANGES_ACTION } from '../actions/puzzleActions';
import { IAsyncLoaded, AsyncActionStatus, IAsyncAction, getAsyncLoadedValue, isAsyncSucceeded } from '../actions/loading';
import { LOGOUT_ACTION } from '../actions/authActions';

const puzzlesInitialState: IAsyncLoaded<IPuzzle[]> = {
    status: AsyncActionStatus.NONE,
};

export function puzzlesReducer(state: IAsyncLoaded<IPuzzle[]> = puzzlesInitialState,
    action: IAsyncAction<any>) {
    switch (action.type) {
        case LOAD_PUZZLES_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        case LOGOUT_ACTION:
            if (isAsyncSucceeded(action)) {
                return puzzlesInitialState;
            }
        case TOGGLE_META_ACTION:
            if (isAsyncSucceeded(action)) {
                const index = state.value.findIndex(puzzle => puzzle.key === action.payload.key);
                return {
                    ...state,
                    value: [
                        ...state.value.slice(0, index),
                        {
                            ...state.value[index],
                            isMeta: action.payload.isMeta,
                        },
                        ...state.value.slice(index + 1),
                    ],
                };
            }
        case ASSIGN_TO_META:
            if (isAsyncSucceeded(action)) {
                const index = state.value.findIndex(puzzle => puzzle.key === action.payload.key);
                return {
                    ...state,
                    value: [
                        ...state.value.slice(0, index),
                        {
                            ...state.value[index],
                            parent: action.payload.parent,
                        },
                        ...state.value.slice(index + 1),
                    ],
                };
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
        case LOGOUT_ACTION:
            if (isAsyncSucceeded(action)) {
                return initialState;
            }
        default:
            return state;
    }
}

export function ignoredPagesReducer(state: IAsyncLoaded<IDiscoveredPage[]> = initialState,
    action: IAsyncAction<any>) {
    switch (action.type) {
        case LOGOUT_ACTION:
            if (isAsyncSucceeded(action)) {
                return initialState;
            }
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
                if (changedPages.changedPages.length > 0) {
                    const createdPuzzlePage = changedPages.changedPages[0];
                    ignoredPages = ignoredPages.filter((page) => page.key !== createdPuzzlePage.key);
                }
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
