import { combineReducers } from "redux";

import { authReducer } from "./authReducers";
import { huntReducer } from "./huntReducers";

export const reducers = combineReducers({
    auth: authReducer,
    hunt: huntReducer,
});
