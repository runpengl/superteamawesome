import {
    AsyncActionStatus,
    IAsyncAction,
    IAsyncLoaded,
    isAsyncSucceeded,
    getAsyncLoadedValue,
    LOAD_USERS_ACTION,
    LOAD_ADMIN_USERS_ACTION,
    TOGGLE_USER_APPROVAL_ACTION,
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

export function userReducer(state: IAsyncLoaded<IUser[]> = initialState, action: IAsyncAction<any>) {
    switch (action.type) {
        case LOAD_USERS_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        case TOGGLE_USER_APPROVAL_ACTION:
            if (isAsyncSucceeded(action)) {
                const toggledUser = action.value as IUser;
                const users = state.value.slice();
                const toggledUserIndex = users.findIndex((user) => user.email === toggledUser.email);
                users[toggledUserIndex] = toggledUser;
                return Object.assign({}, state, { value: users });
            }
        default: return state;
    }
}
