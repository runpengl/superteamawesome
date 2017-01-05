import { Dispatch } from "redux";
import { IGoogleApi, IGoogleDriveFile } from "gapi";

import { IAppState } from "../state";
import {
    asyncActionInProgressPayload,
    asyncActionSucceededPayload,
} from "./loading";

const gapiPromise = (require("google-client-api") as any)();

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

export function getFolder(fileId: string): Promise<IGoogleDriveFile> {
    return new Promise<IGoogleDriveFile>((resolve) => {
        gapiPromise.then((gapi: IGoogleApi) => {
            const request = gapi.client.drive.files.get({
                fileId,
            });
            request.execute((file) => {
                resolve(file);
            });
        });
    });
}

export function loadGoogleApi(accessToken: string, refreshToken?: string) {
    let gapi: IGoogleApi;
    return gapiPromise
        .then((gapiResponse: IGoogleApi) => {
            gapi = gapiResponse;
            return new Promise((resolve) => {
                gapi.client.load("drive", "v2", () => {
                    resolve();
                });
            });
        })
        .then(() => {
            gapi.auth.setToken({ access_token: accessToken, refresh_token: refreshToken });
            return new Promise((resolve) => resolve());
        });
}