import { LOAD_ALL_HUNTS_ACTION } from "../actions/huntActions";
import { AsyncActionStatus, getAsyncLoadedValue, IAsyncAction, IAsyncLoaded } from "../actions/loading";
import { IHuntState } from "../state";

const initialState: IAsyncLoaded<{ [key: string]: IHuntState }> = {
    status: AsyncActionStatus.NONE,
};

export function huntsReducer(
    state: IAsyncLoaded<{ [key: string]: IHuntState }> = initialState,
    action: IAsyncAction<{ [key: string]: IHuntState }>,
) {
    switch (action.type) {
        case LOAD_ALL_HUNTS_ACTION:
            return {
                ...state,
                ...getAsyncLoadedValue(action),
            };
        default:
            return state;
    }
}
