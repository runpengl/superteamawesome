import {
    AsyncActionStatus,
    IAsyncAction,
    IAsyncLoaded,
    getAsyncLoadedValue,
    LOAD_USERS_ACTION,
    LOAD_ADMIN_USERS_ACTION,
} from "../actions";
import { IUser } from "../state";

const initialState: IAsyncLoaded<IUser[]> = {
    status: AsyncActionStatus.NONE,
};
export function adminUserReducer(state: IAsyncLoaded<IUser[]> = initialState, action: IAsyncAction<IUser[]>) {
    switch (action.type) {
        case LOAD_ADMIN_USERS_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        default: return state;
    }
}

export function userReducer(state: IAsyncLoaded<IUser[]> = initialState, action: IAsyncAction<IUser[]>) {
    switch (action.type) {
        case LOAD_USERS_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        default: return state;
    }
}
