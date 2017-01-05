import { IGoogleApi, IGoogleDriveFile } from "gapi";

const gapiPromise = (require("google-client-api") as any)();

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

export function createSheet(templateFileId: string, driveFolderId: string, title: string) {
    return new Promise<IGoogleDriveFile>((resolve) => {
        gapiPromise.then((gapi: IGoogleApi) => {
            const request = gapi.client.drive.files.copy({
                fileId: templateFileId,
                resource: {
                    parents: [{ id: driveFolderId }],
                    title,
                }
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