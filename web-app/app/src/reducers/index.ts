import { combineReducers } from "redux";

import { authReducer } from "./authReducers";
import { huntReducer } from "./huntReducers";
import { discoveredPuzzleReducer } from "./puzzleReducers";

export const reducers = combineReducers({
    auth: authReducer,
    discoveredPuzzles: discoveredPuzzleReducer,
    hunt: huntReducer,
});
