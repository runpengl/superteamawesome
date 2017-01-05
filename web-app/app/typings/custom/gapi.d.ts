declare module "gapi" {
    namespace GoogleApis {
        export interface IGoogleApi {
            auth: IGoogleAuth;
            client: IGoogleClient;
        }

        export interface IGoogleAuth {
            setToken: (authOptions: IGoogleAuthOptions) => void;
        }

        export interface IGoogleClient {
            drive?: IGoogleDriveClient;
            load: (apiName: string, version: string, callback: () => void) => void;
        }

        export interface IGoogleDriveClient {
            files: IGoogleDriveFilesClient;
        }

        export interface IGoogleDriveFilesClient {
            get: (params: { fileId: string }) => IGoogleRequest<IGoogleDriveFile>;
            list: (params: { q?: string }) => IGoogleRequest<IGoogleDriveFilesList>;
        }

        export interface IGoogleDriveFilesList {
            etag: string,
            selfLink: string,
            nextPageToken?: string,
            nextLink?: string,
            items: IGoogleDriveFile[];
        }

        export interface IGoogleDriveFile {
            alternateLink: string;
            createdDate: string;
            iconLink: string;
            id: string;
            kind: string;
            modifiedDate: string;
            labels: IGoogleDriveFileLabel;
            lastModifyingUserName: string;
            mimeType: string;
            parents: IGoogleDriveParentReference[];
            title: string;
        }

        export interface IGoogleDriveParentReference {
            id: string;
            selfLink: string;
            parentLink: string;
            isRoot: boolean;
        }

        export interface IGoogleDriveFileLabel {
            hidden: boolean;
            restricted: boolean;
            starred: boolean;
            trashed: boolean;
            viewed: boolean;
        }

        export interface IGoogleRequest<T> {
            execute: (callback: (response: T) => void) => void;
        }

        export interface IGoogleAuthOptions {
            access_token: string;
            refresh_token?: string;
        }
    }
    export = GoogleApis;
}