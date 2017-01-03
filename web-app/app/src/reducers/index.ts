import { combineReducers } from "redux";

import { authReducer } from "./authReducers";
import { huntReducer } from "./huntReducers";
import { discoveredPageReducer } from "./puzzleReducers";

export const reducers = combineReducers({
    auth: authReducer,
    discoveredPages: discoveredPageReducer,
    hunt: huntReducer,
});
