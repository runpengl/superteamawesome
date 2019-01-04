import { IAuthState } from "../state";
import { LOGIN_ACTION, LOGOUT_ACTION } from '../actions/authActions';
import { isAsyncSucceeded, IAsyncAction } from '../actions/loading';
import { LOAD_SLACK_TOKEN_ACTION } from '../actions/slackActions';

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
