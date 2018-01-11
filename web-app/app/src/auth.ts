import * as firebase from "firebase";

import { config } from "./config";

firebase.initializeApp(config.firebase);

export const firebaseAuth = firebase.auth;
export const firebaseDatabase = firebase.database();

export const scopes = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/urlshortener",
];