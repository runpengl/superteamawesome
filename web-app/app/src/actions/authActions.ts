import { Dispatch } from "redux";
import * as firebase from "firebase";

import { firebaseAuth, provider } from "../auth";
import { IAppState } from "../state";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload, 
    asyncActionSucceededPayload,
} from "./loading";

export const LOGIN_ACTION = "LOGIN_ACTION";
export interface ILoginActionPayload {
    googleToken: string;
    user: firebase.UserInfo;
}

export function loginAction() {
    return (dispatch: Dispatch<IAppState>, _getState: () => IAppState) => {
        dispatch(asyncActionInProgressPayload<ILoginActionPayload>(LOGIN_ACTION));
        firebaseAuth().signInWithPopup(provider).then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const token = result.credential.accessToken;
            // The signed-in user info.
            const user = result.user;
            
            dispatch(asyncActionSucceededPayload<ILoginActionPayload>(
                LOGIN_ACTION,
                {
                    googleToken: token,
                    user,
                }
            ));
        }).catch((error) => {
            dispatch(asyncActionFailedPayload<ILoginActionPayload>(LOGIN_ACTION, error));
        });
    }
}
