import { combineReducers } from "redux";

import { authReducer } from "./authReducers";
import { huntReducer } from "./huntReducers";
import { discoveredPageReducer, ignoredPagesReducer, puzzlesReducer } from "./puzzleReducers";
import { huntDriveFolderReducer } from "./googleReducers";
import { lifecycleReducer } from "./lifecycleReducers";
import { adminUserReducer, userReducer } from "./userReducers";

export const reducers = combineReducers({
    adminUsers: adminUserReducer,
    auth: authReducer,
    discoveredPages: discoveredPageReducer,
    hunt: huntReducer,
    huntDriveFolder: huntDriveFolderReducer,
    ignoredPages: ignoredPagesReducer,
    lifecycle: lifecycleReducer,
    puzzles: puzzlesReducer,
    users: userReducer,
});
