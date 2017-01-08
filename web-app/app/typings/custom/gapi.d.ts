declare module "gapi" {
    namespace GoogleApis {
        export interface IGoogleClientApi {
            auth: IGoogleClientAuth;
            client: IGoogleClient;
        }

        export interface IGooglePlatformApi {
            auth2: IGoogleAuth2;
            load: (client: string, callback: () => void) => void;
        }

        export interface IGoogleAuth2 {
            init: (params: {
                client_id: string,
                scope: string,
            }) => IGoogleAuth;
        }

        export interface IGoogleAuth {
            currentUser: { get: () => IGoogleUser };
            then: (onInit: () => void) => void;
        }

        export interface IGoogleUser {
            reloadAuthResponse: () => Promise<IGoogleAuthResponse>;
        }

        export interface IGoogleAuthResponse {
            access_token: string;
            id_token: string;
            login_hint: string;
            scope: string;
            expires_in: string;
            first_issued_at: string;
            expires_at: string;
        }

        export interface IGoogleClientAuth {
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
            copy: (params: { fileId: string, resource: IGoogleDriveFile }) => IGoogleRequest<IGoogleDriveFile>;
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
            alternateLink?: string;
            createdDate?: string;
            iconLink?: string;
            id?: string;
            kind?: string;
            modifiedDate?: string;
            labels?: IGoogleDriveFileLabel;
            lastModifyingUserName?: string;
            mimeType?: string;
            parents: IGoogleDriveParentReference[];
            title: string;
        }

        export interface IGoogleDriveParentReference {
            id: string;
            selfLink?: string;
            parentLink?: string;
            isRoot?: boolean;
        }

        export interface IGoogleDriveFileLabel {
            hidden: boolean;
            restricted: boolean;
            starred: boolean;
            trashed: boolean;
            viewed: boolean;
        }

        export interface IGoogleRequest<T> {
            execute: (callback: (response: T | Error) => void) => void;
        }

        export interface IGoogleAuthOptions {
            access_token: string;
            refresh_token?: string;
        }
    }
    export = GoogleApis;
}