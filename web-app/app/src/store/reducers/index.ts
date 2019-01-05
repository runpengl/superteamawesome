import { combineReducers } from "redux";

import { activeHuntReducer } from "./activeHuntReducers";
import { authReducer } from "./authReducers";
import { huntDriveFolderReducer } from "./googleReducers";
import { huntsReducer } from "./huntsReducers";
import { lifecycleReducer } from "./lifecycleReducers";
import { discoveredPageReducer, ignoredPagesReducer, puzzlesReducer } from "./puzzleReducers";
import { adminUserReducer, userReducer } from "./userReducers";

export const reducers = combineReducers({
    adminUsers: adminUserReducer,
    auth: authReducer,
    discoveredPages: discoveredPageReducer,
    activeHunt: activeHuntReducer,
    huntDriveFolder: huntDriveFolderReducer,
    hunts: huntsReducer,
    ignoredPages: ignoredPagesReducer,
    lifecycle: lifecycleReducer,
    puzzles: puzzlesReducer,
    users: userReducer,
});
