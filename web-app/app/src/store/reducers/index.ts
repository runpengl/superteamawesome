import { combineReducers } from "redux";

import { authReducer } from "./authReducers";
import { huntDriveFolderReducer } from "./googleReducers";
import { huntReducer } from "./huntReducers";
import { lifecycleReducer } from "./lifecycleReducers";
import { discoveredPageReducer, ignoredPagesReducer, puzzlesReducer } from "./puzzleReducers";
import { adminUserReducer, userReducer } from "./userReducers";

export const reducers = combineReducers({
    adminUsers: adminUserReducer,
    auth: authReducer,
    discoveredPages: discoveredPageReducer,
    activeHunt: huntReducer,
    huntDriveFolder: huntDriveFolderReducer,
    ignoredPages: ignoredPagesReducer,
    lifecycle: lifecycleReducer,
    puzzles: puzzlesReducer,
    users: userReducer,
});
