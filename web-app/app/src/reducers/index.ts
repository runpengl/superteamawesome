import { combineReducers } from "redux";

import { authReducer } from "./authReducers";
import { huntReducer } from "./huntReducers";
import { discoveredPageReducer, ignoredPagesReducer, puzzlesReducer } from "./puzzleReducers";
import { huntDriveFolderReducer } from "./googleReducers";

export const reducers = combineReducers({
    auth: authReducer,
    discoveredPages: discoveredPageReducer,
    hunt: huntReducer,
    huntDriveFolder: huntDriveFolderReducer,
    ignoredPages: ignoredPagesReducer,
    puzzles: puzzlesReducer,
});
