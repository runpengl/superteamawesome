/// <reference path="google-auth-library.d.ts" />
declare module "googleapis" {
namespace GoogleApis {
    export module auth {
        const OAuth2: typeof GoogleAuthLibrary.OAuth2Client;
    }

    interface DriveServiceV3 {
        files: {
            copy(options: {
                fileId: string;
                resource: {
                    title?: string;
                    parents?: Array<{ id: string }>;
                }
            }): void;
            insert(options: {
                resource: {
                    title?: string;
                    parents?: Array<{ id: string }>;
                    mimeType?: string;
                };
            }): void;
            get(options: {
                fileId: string;
            }): void;
            list(options: {
                pageSize?: number;
                fields?: string;
                q?: string;
            }): void;
        };
    }

    export function drive(version: "v3"): DriveServiceV3;
    export function drive(options: {
        version: "v3";
        auth: GoogleAuthLibrary.OAuth2Client;
    }): DriveServiceV3;

    export function options(options: {
        auth?: GoogleAuthLibrary.OAuth2Client;
    }): void;
}
export = GoogleApis;
}
