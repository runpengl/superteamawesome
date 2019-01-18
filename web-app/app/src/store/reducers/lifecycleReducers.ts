import { LOGIN_ACTION, LOGOUT_ACTION } from "../actions/authActions";
import { ADD_NEW_HUNT_ACTION, SAVE_HUNT_ACTION } from "../actions/huntActions";
import {
    asyncNotStarted,
    getAsyncLoadedValue,
    IAsyncAction,
    isAsyncFailed,
    isAsyncInProgress,
    isAsyncSucceeded,
} from "../actions/loading";
import {
    CREATE_MANUAL_PUZZLE_ACTION,
    CREATE_PUZZLE_ACTION,
    CREATED_SINGLE_PUZZLE,
    DELETE_PUZZLE_ACTION,
} from "../actions/puzzleActions";
import { IAppLifecycle, LoginStatus } from "../state";

const initialState: IAppLifecycle = {
    createdSinglePuzzle: asyncNotStarted(),
    createPuzzleFailure: undefined,
    creatingManualPuzzle: false,
    createManualPuzzleFailure: undefined,
    deletingPuzzleIds: [],
    loginStatus: LoginStatus.NONE,
    addingNewHunt: asyncNotStarted(),
    savingHuntInfo: asyncNotStarted(),
};

export function lifecycleReducer(state: IAppLifecycle = initialState, action: IAsyncAction<any>) {
    switch (action.type) {
        case ADD_NEW_HUNT_ACTION:
            return {
                ...state,
                addingNewHunt: getAsyncLoadedValue({ ...action, value: undefined }),
            };
        case SAVE_HUNT_ACTION:
            return {
                ...state,
                savingHuntInfo: getAsyncLoadedValue({ ...action, value: undefined }),
            };
        case CREATE_PUZZLE_ACTION:
            if (isAsyncFailed(action)) {
                return { ...state, createPuzzleFailure: action.error };
            } else if (isAsyncSucceeded(action)) {
                return { ...state, createPuzzleFailure: undefined };
            } else {
                return state;
            }
        case CREATED_SINGLE_PUZZLE:
            return {
                ...state,
                createdSinglePuzzle: getAsyncLoadedValue({ ...action, value: undefined }),
            };
        case CREATE_MANUAL_PUZZLE_ACTION:
            if (isAsyncInProgress(action)) {
                return { ...state, creatingManualPuzzle: true, createManualPuzzleFailure: undefined };
            } else if (isAsyncFailed(action)) {
                return { ...state, creatingManualPuzzle: false, createManualPuzzleFailure: action.error };
            } else if (isAsyncSucceeded(action)) {
                return { ...state, creatingManualPuzzle: false, createManualPuzzleFailure: undefined };
            }
        case DELETE_PUZZLE_ACTION:
            const puzzle = action.payload as string;
            const deletingPuzzleIndex = state.deletingPuzzleIds.indexOf(puzzle);
            if (isAsyncInProgress(action) && deletingPuzzleIndex < 0) {
                return {
                    ...state,
                    deletingPuzzleIds: state.deletingPuzzleIds.concat(puzzle),
                    deletingPuzzleError: undefined,
                };
            } else if (isAsyncSucceeded(action)) {
                const newDeletingPuzzles = state.deletingPuzzleIds.slice();
                newDeletingPuzzles.splice(deletingPuzzleIndex, 1);
                return { ...state, deletingPuzzleIds: newDeletingPuzzles, deletingPuzzleError: undefined };
            } else if (isAsyncFailed(action)) {
                const newDeletingPuzzles = state.deletingPuzzleIds.slice();
                newDeletingPuzzles.splice(deletingPuzzleIndex, 1);
                return { ...state, deletingPuzzleIds: newDeletingPuzzles, deletingPuzzleError: action.error };
            }
        case LOGIN_ACTION:
            if (isAsyncInProgress(action)) {
                return { ...state, loginStatus: LoginStatus.LOGGING_IN, loginError: undefined };
            } else if (isAsyncFailed(action)) {
                return { ...state, loginStatus: LoginStatus.LOGGED_OUT, loginError: action.error };
            } else if (isAsyncSucceeded(action)) {
                return { ...state, loginStatus: LoginStatus.LOGGED_IN, loginError: undefined };
            }
        case LOGOUT_ACTION:
            if (isAsyncSucceeded(action)) {
                return { ...state, loginStatus: LoginStatus.NONE };
            }
        default:
            return state;
    }
}
