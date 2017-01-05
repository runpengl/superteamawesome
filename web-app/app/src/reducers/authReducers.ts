import { IAsyncAction, isAsyncSucceeded, LOGIN_ACTION, LOGOUT_ACTION } from "../actions";
import { IAuthState } from "../state";

const initialState: IAuthState = {
    googleToken: undefined,
    user: undefined,
};
export function authReducer(state: IAuthState = initialState, action: IAsyncAction<IAuthState>) {
    switch (action.type) {
        case LOGIN_ACTION:
            if (isAsyncSucceeded(action)) {
                return Object.assign({}, state, action.value);
            }
        case LOGOUT_ACTION:
            if (isAsyncSucceeded(action)) {
                return initialState;
            }
        default:
            return state;
    }
}
