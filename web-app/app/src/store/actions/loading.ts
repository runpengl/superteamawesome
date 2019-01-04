export type AsyncActionStatus = "IN_PROGRESS" | "FAILED" | "SUCCEEDED" | "NONE";
export const AsyncActionStatus = {
    FAILED: "FAILED" as AsyncActionStatus,
    IN_PROGRESS: "IN_PROGRESS" as AsyncActionStatus,
    NONE: "NONE" as AsyncActionStatus,
    SUCCEEDED: "SUCCEEDED" as AsyncActionStatus,
};

export interface IAsyncAction<T> {
    error?: Error;
    payload?: any;
    status: AsyncActionStatus;
    type: string;
    value?: T;
}

export interface IAsyncLoaded<T> {
    error?: Error;
    status: AsyncActionStatus;
    value?: T;
}

export function isAsyncInProgress<T>(action: IAsyncAction<T> | IAsyncLoaded<T>) {
    return action.status === AsyncActionStatus.IN_PROGRESS;
}

export function isAsyncSucceeded<T>(action: IAsyncAction<T>) {
    return action.status === AsyncActionStatus.SUCCEEDED;
}

export function isAsyncLoaded<T>(value: IAsyncLoaded<T>) {
    return value.status === AsyncActionStatus.SUCCEEDED;
}

export function isAsyncFailed<T>(action: IAsyncAction<T> | IAsyncLoaded<T>) {
    return action.status === AsyncActionStatus.FAILED;
}

export function getAsyncLoadedValue<T>(action: IAsyncAction<T>): IAsyncLoaded<T> {
    return {
        error: action.error,
        status: action.status,
        value: action.value,
    };
}

export function asyncActionInProgressPayload<T>(type: string, payload?: any): IAsyncAction<T> {
    return {
        payload,
        status: AsyncActionStatus.IN_PROGRESS,
        type,
    };
}

export function asyncActionSucceededPayload<T>(type: string, value?: T, payload?: any): IAsyncAction<T> {
    return {
        payload,
        status: AsyncActionStatus.SUCCEEDED,
        type,
        value,
    };
}

export function asyncActionFailedPayload<T>(type: string, error: Error, payload?: any): IAsyncAction<T> {
    return {
        error,
        payload,
        status: AsyncActionStatus.FAILED,
        type,
    };
}
