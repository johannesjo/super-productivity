export type EntityId = string;
export type ISODate = `${number}-${number}-${number}`;
export type TaskStatus = 'open' | 'done' | 'archived';
export type TaskPriority = 0 | 1 | 2 | 3;
export interface ChecklistItem {
    id: EntityId;
    title: string;
    done: boolean;
}
export interface Attachment {
    id: EntityId;
    name: string;
    mimeType: string;
    size: number;
    localPath?: string;
    url?: string;
}
export interface IssueRef {
    providerId: string;
    issueId: string;
    key: string;
    url: string;
}
export interface Task {
    id: EntityId;
    title: string;
    notes: string;
    status: TaskStatus;
    priority: TaskPriority;
    projectId: EntityId;
    parentId?: EntityId;
    tagIds: EntityId[];
    checklist: ChecklistItem[];
    attachments: Attachment[];
    issue?: IssueRef;
    dueDay?: ISODate;
    dueAt?: string;
    repeatRule?: string;
    reminderAt?: string;
    estimateMs: number;
    trackedMs: number;
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
    order: number;
}
export interface Project {
    id: EntityId;
    title: string;
    color: string;
    icon: string;
    archived: boolean;
    createdAt: number;
}
export interface Tag {
    id: EntityId;
    title: string;
    color: string;
}
export interface TimeSession {
    id: EntityId;
    taskId?: EntityId;
    mode: 'pomodoro' | 'flowtime' | 'stopwatch';
    startedAt: number;
    endedAt?: number;
    durationMs: number;
}
export interface DomainState {
    schemaVersion: 1;
    tasks: Record<EntityId, Task>;
    projects: Record<EntityId, Project>;
    tags: Record<EntityId, Tag>;
    sessions: Record<EntityId, TimeSession>;
    taskOrder: EntityId[];
    selectedTaskId?: EntityId;
    activeProjectId: EntityId;
    activeSessionId?: EntityId;
}
export type DomainCommand = {
    type: 'task/add';
    payload: {
        task: Task;
    };
} | {
    type: 'task/update';
    payload: {
        id: EntityId;
        patch: Partial<Omit<Task, 'id'>>;
    };
} | {
    type: 'task/toggle';
    payload: {
        id: EntityId;
        completedAt: number;
    };
} | {
    type: 'task/remove';
    payload: {
        id: EntityId;
    };
} | {
    type: 'task/reorder';
    payload: {
        ids: EntityId[];
    };
} | {
    type: 'task/select';
    payload: {
        id?: EntityId;
    };
} | {
    type: 'project/add';
    payload: {
        project: Project;
    };
} | {
    type: 'project/select';
    payload: {
        id: EntityId;
    };
} | {
    type: 'session/start';
    payload: {
        session: TimeSession;
    };
} | {
    type: 'session/stop';
    payload: {
        id: EntityId;
        endedAt: number;
        durationMs: number;
    };
} | {
    type: 'state/replace';
    payload: {
        state: DomainState;
    };
};
export interface DomainOperation {
    id: EntityId;
    clientId: EntityId;
    sequence: number;
    timestamp: number;
    command: DomainCommand;
    source: 'local' | 'remote' | 'replay' | 'import';
}
export interface ClockPort {
    now(): number;
    today(): ISODate;
}
export declare const INBOX_PROJECT_ID = "inbox";
export declare const createInitialState: (now?: number) => DomainState;
export declare const reduceDomain: (state: DomainState, command: DomainCommand) => DomainState;
export declare const selectOrderedTasks: (state: DomainState) => Task[];
/** Converts a Super Productivity complete backup (wrapper or raw data) into Noura's plugin-free state. */
export declare const migrateLegacyBackupToNoura: (input: unknown, now?: number) => DomainState;
