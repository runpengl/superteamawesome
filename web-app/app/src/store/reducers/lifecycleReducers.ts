import { IAppLifecycle, LoginStatus } from "../state";
import { IAsyncAction, isAsyncFailed, isAsyncSucceeded, isAsyncInProgress } from '../actions/loading';
import { CREATE_PUZZLE_ACTION, CREATE_MANUAL_PUZZLE_ACTION, DELETE_PUZZLE_ACTION } from '../actions/puzzleActions';
import { LOGIN_ACTION, LOGOUT_ACTION } from '../actions/authActions';

const initialState: IAppLifecycle = {
    createPuzzleFailure: undefined,
    creatingManualPuzzle: false,
    createManualPuzzleFailure: undefined,
    deletingPuzzleIds: [],
    loginStatus: LoginStatus.NONE,
};

export function lifecycleReducer(state: IAppLifecycle = initialState, action: IAsyncAction<any>) {
    switch (action.type) {
        case CREATE_PUZZLE_ACTION:
            if (isAsyncFailed(action)) {
                return Object.assign({}, state, { createPuzzleFailure: action.error });
            } else if (isAsyncSucceeded(action)) {
                return Object.assign({}, state, { createPuzzleFailure: undefined });
            } else {
                return state;
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
        case LOGIN_ACTION:
            if (isAsyncInProgress(action)) {
                return Object.assign({}, state, { loginStatus: LoginStatus.LOGGING_IN, loginError: undefined });
            } else if (isAsyncFailed(action)) {
                return Object.assign({}, state, { loginStatus: LoginStatus.NONE, loginError: action.error });
            } else if (isAsyncSucceeded(action)) {
                return Object.assign({}, state, { loginStatus: LoginStatus.LOGGED_IN, loginError: undefined });
            }
        case LOGOUT_ACTION:
            if (isAsyncSucceeded(action)) {
                return Object.assign({}, state, { loginStatus: LoginStatus.NONE });
            }
        default: return state;
    }
}