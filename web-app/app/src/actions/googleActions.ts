import { Dispatch } from "redux";
import { IGoogleDriveFile } from "gapi";

import { getFolder } from "../services";
import { IAppState } from "../state";
import {
    asyncActionInProgressPayload,
    asyncActionSucceededPayload,
} from "./loading";

export const LOAD_DRIVE_FOLDER_ACTION = "LOAD_DRIVE_FOLDER";
export function loadFolderAction(fileId: string) {
    return (dispatch: Dispatch<IAppState>) => {
        loadFolder(dispatch, fileId);
    };
}

export function loadFolder(dispatch: Dispatch<IAppState>, fileId: string): Promise<void> {
    dispatch(asyncActionInProgressPayload<IGoogleDriveFile>(LOAD_DRIVE_FOLDER_ACTION));
    return new Promise<void>((resolve) => {
        getFolder(fileId).then((file) => {
            dispatch(asyncActionSucceededPayload<IGoogleDriveFile>(LOAD_DRIVE_FOLDER_ACTION, file));
            resolve();
        });
    });
}
