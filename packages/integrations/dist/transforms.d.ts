import type { Task, TaskPriority } from '@noura/domain';
export interface RemoteIssue {
    id: string;
    key: string;
    title: string;
    description: string;
    state: string;
    priority: number;
    assignee?: string;
    reporter?: string;
    url: string;
    createdAt: string;
    updatedAt: string;
}
export interface RemoteComment {
    id: string;
    author: string;
    body: string;
    createdAt: string;
}
export interface RemoteWorklog {
    id: string;
    author: string;
    startedAt: string;
    timeSpentSeconds: number;
    comment?: string;
}
/** Normalized seed for creating a Noura task from a remote issue. */
export interface TaskSeed {
    title: string;
    notes: string;
    priority: TaskPriority;
    issue: {
        providerId: string;
        issueId: string;
        key: string;
        url: string;
    };
}
export declare const normalizePriority: (value: unknown) => TaskPriority;
export declare const issueToTaskSeed: (issue: RemoteIssue, providerId: string, projectId?: string) => TaskSeed;
/** Marks every produced seed with the owning project when importing a backlog. */
export declare const importBacklogSeeds: (issues: RemoteIssue[], providerId: string, projectId?: string) => TaskSeed[];
export declare const remoteCommentText: (comments: RemoteComment[]) => string;
export declare const taskToIssueSummary: (task: Task) => string;
