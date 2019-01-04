import {
    IAsyncAction,
    isAsyncSucceeded,
    LOGIN_ACTION,
    LOGOUT_ACTION,
    LOAD_SLACK_TOKEN_ACTION,
} from "../actions";
import { IAuthState } from "../store/state";

const initialState: IAuthState = {
    googleToken: undefined,
    slackToken: undefined,
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
        case LOAD_SLACK_TOKEN_ACTION:
            if (isAsyncSucceeded(action)) {
                return Object.assign({}, state, { slackToken: action.value });
            }
        default:
            return state;
    }
}
