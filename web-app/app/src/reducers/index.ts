import { combineReducers } from "redux";

import { authReducer } from "./authReducers";
import { huntReducer } from "./huntReducers";
import { discoveredPageReducer, ignoredPagesReducer, puzzlesReducer } from "./puzzleReducers";
import { huntDriveFolderReducer } from "./googleReducers";
import { lifecycleReducer } from "./lifecycleReducers";

export const reducers = combineReducers({
    auth: authReducer,
    discoveredPages: discoveredPageReducer,
    hunt: huntReducer,
    huntDriveFolder: huntDriveFolderReducer,
    ignoredPages: ignoredPagesReducer,
    lifecycle: lifecycleReducer,
    puzzles: puzzlesReducer,
});
