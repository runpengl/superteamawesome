import { AsyncActionStatus, getAsyncLoadedValue, IAsyncAction, IAsyncLoaded, LOAD_HUNT_ACTION } from "../actions";
import { IHuntState } from "../state";

const initialState: IAsyncLoaded<IHuntState> = {
    status: AsyncActionStatus.NONE,
}

export function huntReducer(state: IAsyncLoaded<IHuntState> = initialState, action: IAsyncAction<IHuntState>) {
    switch (action.type) {
        case LOAD_HUNT_ACTION:
            return Object.assign({}, state, getAsyncLoadedValue(action));
        default:
            return state;
    }
}
