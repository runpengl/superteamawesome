/// <reference path="../../typings/custom/gapi.d.ts" />

import { IGoogleClientApi, IGooglePlatformApi, IGoogleAuth, IGoogleDriveFile } from "gapi";

import { scopes } from "../auth";
import { config } from "../config";

const gapiPromise = (require("google-client-api") as any)();

export function getFolder(fileId: string): Promise<IGoogleDriveFile> {
    return new Promise<IGoogleDriveFile>((resolve) => {
        gapiPromise.then((gapi: IGoogleClientApi) => {
            const request = gapi.client.drive.files.get({
                fileId,
            });
            request.execute((file) => {
                if ((file as Error).message !== undefined) {
                    throw file;
                } else {
                    resolve(file as IGoogleDriveFile);
                }
            });
        });
    });
}

export function createSheet(templateFileId: string, driveFolderId: string, title: string) {
    return new Promise<IGoogleDriveFile>((resolve) => {
        gapiPromise.then((gapi: IGoogleClientApi) => {
            const request = gapi.client.drive.files.copy({
                fileId: templateFileId,
                resource: {
                    parents: [{ id: driveFolderId }],
                    title,
                }
            });
            request.execute((file) => {
                if ((file as Error).message !== undefined) {
                    throw file;
                } else {
                    resolve(file as IGoogleDriveFile);
                }
            });
        });
    });
}

export function setSheetLinks(spreadSheetFileId: string, puzzleLink: string, slackLink: string) {
    return new Promise<void>((resolve) => {
        gapiPromise.then((gapi: IGoogleClientApi) => {
            let values: string[][] = [];
            values.push([
                `=HYPERLINK("${puzzleLink}","puzzle link")`,
                `=HYPERLINK("${slackLink}", "slack link")`
            ]);
            const request = gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadSheetFileId,
                range: "B$1:C$1",
                valueInputOption: "USER_ENTERED",
                responseValueRenderOption: "FORMATTED_VALUE",
                values,
            });
            request.execute((response) => {
                if ((response as Error).message !== undefined) {
                    throw response;
                } else {
                    resolve();
                }
            });
        });
    });
}

export function loadGoogleApi(accessToken: string) {
    let gapi: IGoogleClientApi;
    return gapiPromise
        .then((gapiResponse: IGoogleClientApi) => {
            gapi = gapiResponse;
            return new Promise((resolve) => {
                gapi.client.load("drive", "v2", () => {
                    gapi.client.load("sheets", "v4", () => {
                        resolve();
                    });
                });
            });
        })
        .then(() => {
            gapi.auth.setToken({ access_token: accessToken });
            return new Promise((resolve) => resolve());
        });
}

export function reloadGoogleAuth() {
    let googleAuth: IGoogleAuth;
    const element = document.getElementsByTagName("script")[0];
    const scriptElement = document.createElement("script") as HTMLScriptElement;
    scriptElement.id = "google-platform-api";
    scriptElement.src = "//apis.google.com/js/client:platform.js";
    element.parentNode.insertBefore(scriptElement, element);
    return new Promise((resolve) => {
        scriptElement.onload = () => {
            let gapi = (window as any).gapi as IGooglePlatformApi;
            gapi.load("auth2", () => {
                googleAuth = gapi.auth2.init({ client_id: config.google.clientId, scope: scopes.join(" ") });
                googleAuth.then(() => {
                    googleAuth.currentUser.get().reloadAuthResponse().then((response) => {
                        resolve(response.access_token);
                    });
                });
            });
        };
    });
}