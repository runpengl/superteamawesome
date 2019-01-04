/// <reference path="../../../typings/custom/gapi.d.ts" />

import { IGoogleDriveFile } from "gapi";
import { IAsyncLoaded, AsyncActionStatus, getAsyncLoadedValue, IAsyncAction } from '../actions/loading';
import { LOAD_DRIVE_FOLDER_ACTION } from '../actions/googleActions';

const driveFolderInitialState: IAsyncLoaded<IGoogleDriveFile> = {
    status: AsyncActionStatus.NONE,
};
export function huntDriveFolderReducer(state: IAsyncLoaded<IGoogleDriveFile> = driveFolderInitialState, action: IAsyncAction<IGoogleDriveFile>) {
    switch (action.type) {
        case LOAD_DRIVE_FOLDER_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        default: return state;
    }
}
