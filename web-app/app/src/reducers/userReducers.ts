import {
    IAsyncAction,
    isAsyncSucceeded,
} from "../actions";
import { IUserGroup } from "../state";

const initialState: IUserGroup = { };
export function adminUserReducer(state: IUserGroup = initialState, action: IAsyncAction<IUserGroup>) {
    switch (action.type) {
        default: return state;
    }
}

export function userReducer(state: IUserGroup = initialState, action: IAsyncAction<IUserGroup>) {
    switch (action.type) {
        default: return state;
    }
}
