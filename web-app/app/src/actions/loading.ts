export enum AsyncActionStatus {
    IN_PROGRESS,
    FAILED,
    SUCCEEDED,
};

export interface IAsyncAction<T> {
    error?: Error;
    status: AsyncActionStatus;
    type: string;
    value?: T;
}

export function isAsyncActionInProgress<T>(action: IAsyncAction<T>) {
    return action.status === AsyncActionStatus.IN_PROGRESS;
}

export function isAsyncActionSucceeded<T>(action: IAsyncAction<T>) {
    return action.status === AsyncActionStatus.SUCCEEDED;
}

export function isAsyncActionFailed<T>(action: IAsyncAction<T>) {
    return action.status === AsyncActionStatus.FAILED;
}

export function asyncActionInProgressPayload<T>(type: string): IAsyncAction<T> {
    return {
        status: AsyncActionStatus.IN_PROGRESS,
        type,
    };
}

export function asyncActionSucceededPayload<T>(type: string, value: T): IAsyncAction<T> {
    return {
        status: AsyncActionStatus.SUCCEEDED,
        type,
        value,
    };
}

export function asyncActionFailedPayload<T>(type: string, error: Error): IAsyncAction<T> {
    return {
        error,
        status: AsyncActionStatus.FAILED,
        type,
    };
}