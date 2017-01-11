import {
    IAsyncAction,
    isAsyncInProgress,
    isAsyncSucceeded,
    isAsyncFailed,
    CREATE_MANUAL_PUZZLE_ACTION,
    CREATE_PUZZLE_ACTION,
    DELETE_PUZZLE_ACTION,
} from "../actions";
import { IAppLifecycle } from "../state";

const initialState: IAppLifecycle = {
    createPuzzleFailure: undefined,
    creatingManualPuzzle: false,
    createManualPuzzleFailure: undefined,
    deletingPuzzleIds: [],
};

export function lifecycleReducer(state: IAppLifecycle = initialState, action: IAsyncAction<any>) {
    switch (action.type) {
        case CREATE_PUZZLE_ACTION:
            if (isAsyncFailed(action)) {
                return Object.assign({}, state, { createPuzzleFailure: action.error });
            } else if (isAsyncSucceeded(action)) {
                return Object.assign({}, state, { createPuzzleFailure: undefined });
            }
        case CREATE_MANUAL_PUZZLE_ACTION:
            if (isAsyncInProgress(action)) {
                return Object.assign({}, state, { creatingManualPuzzle: true, createManualPuzzleFailure: undefined });
            } else if (isAsyncFailed(action)) {
                return Object.assign({}, state, { creatingManualPuzzle: false, createManualPuzzleFailure: action.error });
            } else if (isAsyncSucceeded(action)) {
                return Object.assign({}, state, { creatingManualPuzzle: false, createManualPuzzleFailure: undefined });
            }
        case DELETE_PUZZLE_ACTION:
            const puzzle = action.payload as string;
            const deletingPuzzleIndex = state.deletingPuzzleIds.indexOf(puzzle);
            if (isAsyncInProgress(action) && deletingPuzzleIndex < 0) {
                return Object.assign({}, state, {
                    deletingPuzzleIds: state.deletingPuzzleIds.concat(puzzle),
                    deletingPuzzleError: undefined,
                });
            } else if (isAsyncSucceeded(action)) {
                const newDeletingPuzzles = state.deletingPuzzleIds.slice();
                newDeletingPuzzles.splice(deletingPuzzleIndex, 1);
                return Object.assign({}, state, {
                    deletingPuzzleIds: newDeletingPuzzles,
                    deletingPuzzleError: undefined,
                });
            } else if (isAsyncFailed(action)) {
                const newDeletingPuzzles = state.deletingPuzzleIds.slice();
                newDeletingPuzzles.splice(deletingPuzzleIndex, 1);
                return Object.assign({}, state, {
                    deletingPuzzleIds: newDeletingPuzzles,
                    deletingPuzzleError: action.error,
                });
            }
        default: return state;
    }
}