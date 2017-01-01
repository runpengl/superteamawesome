import { combineReducers } from "redux";

import { authReducer } from "./authReducers";

export const reducers = combineReducers({
    auth: authReducer,
});
