declare namespace GoogleAuthLibrary {
    interface Tokens {
        access_token: string;
        refresh_token?: string;
    }
    export class OAuth2Client {
        constructor(clientId: string, clientSecret: string, redirectUrl: string);

        public generateAuthUrl(params: {
            access_type: "online" | "offline";
            scope: string | string[];
        }): string;

        public getToken(code: string, callback: (err: Error, response: Tokens) => any): void;

        public setCredentials(credentials: {
            access_token: string;
            refresh_token?: string;
        }): void;
    }
}
declare module "google-auth-library" {
class GoogleAuth {
    public OAuth2: typeof GoogleAuthLibrary.OAuth2Client;
}
export = GoogleAuth;
}
