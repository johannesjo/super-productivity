import type { RemoteIssue } from './transforms';
export interface IssuePollerOptions {
    fetch: () => Promise<RemoteIssue[]>;
    onNew: (issues: RemoteIssue[]) => void;
    isEnabled?: () => boolean;
}
export declare class IssuePoller {
    #private;
    constructor(options: IssuePollerOptions);
    /** Polls once; returns the genuinely new issues and emits them. */
    poll(): Promise<RemoteIssue[]>;
    /** Seed the known set (e.g. from the first backlog import) without emitting. */
    seed(ids: string[]): void;
    knownCount(): number;
    forget(id: string): void;
}
