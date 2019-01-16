export interface IDiscoveredPage {
    host: string;
    key: string;
    ignored?: boolean;
    path: string;
    title: string;
}

export interface IPuzzle {
    createdAt: string;
    host: string;
    hunt: string;
    ignoreLink?: boolean;
    index?: number;
    isMeta?: boolean;
    key?: string;
    name: string;
    /**
     * @deprecated use parents instead
     */
    parent?: string;
    parents?: string[];
    path: string;
    slackChannel: string;
    slackChannelId: string;
    solution?: string;
    spreadsheetId: string;
    status: PuzzleStatus;

    // Whether or not this has been announced on slack
    announced?: boolean;
}

export type PuzzleStatus = "inProgress" | "solved" | "new" | "stuck" | "backsolved";
export const PuzzleStatus = {
    IN_PROGRESS: "inProgress" as PuzzleStatus,
    NEW: "new" as PuzzleStatus,
    SOLVED: "solved" as PuzzleStatus,
    STUCK: "stuck" as PuzzleStatus,
    BACKSOLVED: "backsolved" as PuzzleStatus,
};
