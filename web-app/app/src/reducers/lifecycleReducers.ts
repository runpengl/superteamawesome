import {
    IAsyncAction,
    isAsyncInProgress,
    isAsyncSucceeded,
    isAsyncFailed,
    CREATE_MANUAL_PUZZLE_ACTION,
    CREATE_PUZZLE_ACTION,
} from "../actions";
import { IAppLifecycle } from "../state";

const initialState: IAppLifecycle = {
    createPuzzleFailure: undefined,
    creatingManualPuzzle: false,
    createManualPuzzleFailure: undefined,
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
        default: return state;
    }
}