import { Dispatch } from "redux";

import { firebaseDatabase } from "../auth";
import { IAppState, IUserGroup } from "../state";
import {
    asyncActionFailedPayload,
    asyncActionInProgressPayload, 
    asyncActionSucceededPayload,
} from "./loading";

export const LOAD_USERS_ACTION = "LOAD_USERS";
export function loadUsersAction() {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IUserGroup>(LOAD_USERS_ACTION));
        firebaseDatabase.ref("/userGroups/admin").on("value", (snapshot) => {
            dispatch(asyncActionSucceededPayload<IUserGroup>(LOAD_USERS_ACTION, snapshot.val()));
        }, (error: Error) => {
            dispatch(asyncActionFailedPayload<IUserGroup>(LOAD_USERS_ACTION, error));
        });
    };
}

export const LOAD_ADMIN_USERS_ACTION = "LOAD_ADMIN_USERS";
export function loadAdminUsersAction() {
    return (dispatch: Dispatch<IAppState>) => {
        dispatch(asyncActionInProgressPayload<IUserGroup>(LOAD_ADMIN_USERS_ACTION));
        firebaseDatabase.ref("/userGroups/users").on("value", (snapshot) => {
            dispatch(asyncActionSucceededPayload<IUserGroup>(LOAD_ADMIN_USERS_ACTION, snapshot.val()));
        }, (error: Error) => {
            dispatch(asyncActionFailedPayload<IUserGroup>(LOAD_ADMIN_USERS_ACTION, error));
        });
    };
}