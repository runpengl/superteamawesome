import {
    IAsyncAction,
    isAsyncSucceeded,
    isAsyncFailed,
    CREATE_PUZZLE_ACTION,
} from "../actions";
import { IAppLifecycle } from "../state";

const initialState: IAppLifecycle = {
    createPuzzleFailure: undefined,
};

export function lifecycleReducer(state: IAppLifecycle = initialState, action: IAsyncAction<any>) {
    switch (action.type) {
        case CREATE_PUZZLE_ACTION:
            if (isAsyncFailed(action)) {
                return Object.assign({}, state, { createPuzzleFailure: action.error });
            } else if (isAsyncSucceeded(action)) {
                return Object.assign({}, state, { createPuzzleFailure: undefined });
            }
        default: return state;
    }
}