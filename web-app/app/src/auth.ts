import * as firebase from "firebase";

import { config } from "./config";

firebase.initializeApp(config.firebase);

export const provider = new firebase.auth.GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/drive");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
export const firebaseAuth = firebase.auth;
export const firebaseDatabase = firebase.database();