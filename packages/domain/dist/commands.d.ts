import type { EntityId, GlobalConfig, HistoryEntry, IssueProviderCfg, IssueRef, Note, NoteBookmark, Project, SimpleCounter, SmartList, Tag, Task, TaskRepeatCfg, TaskViewConfig, TrackedEntry, WorkContext, Worklog } from './entities';
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
        doneOn: number;
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
    type: 'task/archive';
    payload: {
        id: EntityId;
        at: number;
    };
} | {
    type: 'task/restore';
    payload: {
        id: EntityId;
    };
} | {
    type: 'task/reset';
    payload: {
        id: EntityId;
        at: number;
    };
} | {
    type: 'task/link-issue';
    payload: {
        id: EntityId;
        issue: IssueRef;
    };
} | {
    type: 'task/unlink-issue';
    payload: {
        id: EntityId;
    };
} | {
    type: 'task/repeat-rollover';
    payload: {
        id: EntityId;
        today: string;
    };
} | {
    type: 'project/add';
    payload: {
        project: Project;
    };
} | {
    type: 'project/update';
    payload: {
        id: EntityId;
        patch: Partial<Omit<Project, 'id'>>;
    };
} | {
    type: 'project/select';
    payload: {
        id: EntityId;
    };
} | {
    type: 'project/archive';
    payload: {
        id: EntityId;
        archived: boolean;
    };
} | {
    type: 'tag/add';
    payload: {
        tag: Tag;
    };
} | {
    type: 'tag/update';
    payload: {
        id: EntityId;
        patch: Partial<Omit<Tag, 'id'>>;
    };
} | {
    type: 'tag/remove';
    payload: {
        id: EntityId;
    };
} | {
    type: 'repeatCfg/add';
    payload: {
        cfg: TaskRepeatCfg;
    };
} | {
    type: 'repeatCfg/update';
    payload: {
        id: EntityId;
        patch: Partial<Omit<TaskRepeatCfg, 'id'>>;
    };
} | {
    type: 'repeatCfg/remove';
    payload: {
        id: EntityId;
    };
} | {
    type: 'note/add';
    payload: {
        note: Note;
    };
} | {
    type: 'note/update';
    payload: {
        id: EntityId;
        patch: Partial<Omit<Note, 'id'>>;
    };
} | {
    type: 'note/remove';
    payload: {
        id: EntityId;
    };
} | {
    type: 'note-bookmark/add';
    payload: {
        noteId: EntityId;
        bookmark: NoteBookmark;
    };
} | {
    type: 'note-bookmark/remove';
    payload: {
        noteId: EntityId;
        bookmarkId: EntityId;
    };
} | {
    type: 'worklog/add';
    payload: {
        entry: Worklog;
    };
} | {
    type: 'worklog/update';
    payload: {
        id: EntityId;
        patch: Partial<Omit<Worklog, 'id'>>;
    };
} | {
    type: 'worklog/remove';
    payload: {
        id: EntityId;
    };
} | {
    type: 'worklog/from-entry';
    payload: {
        entry: TrackedEntry;
    };
} | {
    type: 'session/start';
    payload: {
        session: TrackedEntry;
    };
} | {
    type: 'session/stop';
    payload: {
        id: EntityId;
        endedAt: number;
        durationMs: number;
    };
} | {
    type: 'session/manual';
    payload: {
        entry: TrackedEntry;
    };
} | {
    type: 'session/remove';
    payload: {
        id: EntityId;
    };
} | {
    type: 'counter/add';
    payload: {
        counter: SimpleCounter;
    };
} | {
    type: 'counter/update';
    payload: {
        id: EntityId;
        patch: Partial<Omit<SimpleCounter, 'id'>>;
    };
} | {
    type: 'counter/toggle';
    payload: {
        id: EntityId;
        at: number;
    };
} | {
    type: 'counter/tick';
    payload: {
        id: EntityId;
        value: number;
    };
} | {
    type: 'counter/remove';
    payload: {
        id: EntityId;
    };
} | {
    type: 'workcontext/add';
    payload: {
        context: WorkContext;
    };
} | {
    type: 'workcontext/update';
    payload: {
        id: EntityId;
        patch: Partial<Omit<WorkContext, 'id'>>;
    };
} | {
    type: 'workcontext/remove';
    payload: {
        id: EntityId;
    };
} | {
    type: 'workcontext/switch';
    payload: {
        id: EntityId;
    };
} | {
    type: 'workcontext/focus';
    payload: {
        id?: EntityId;
    };
} | {
    type: 'issueProvider/add';
    payload: {
        cfg: IssueProviderCfg;
    };
} | {
    type: 'issueProvider/update';
    payload: {
        id: EntityId;
        patch: Partial<Omit<IssueProviderCfg, 'id'>>;
    };
} | {
    type: 'issueProvider/remove';
    payload: {
        id: EntityId;
    };
} | {
    type: 'config/update';
    payload: {
        patch: Partial<GlobalConfig>;
    };
} | {
    type: 'taskView/update';
    payload: {
        id: EntityId;
        patch: Partial<Omit<TaskViewConfig, 'id'>>;
    };
} | {
    type: 'smartList/add';
    payload: {
        list: SmartList;
    };
} | {
    type: 'smartList/update';
    payload: {
        id: EntityId;
        patch: Partial<Omit<SmartList, 'id'>>;
    };
} | {
    type: 'smartList/remove';
    payload: {
        id: EntityId;
    };
} | {
    type: 'history/record';
    payload: {
        entry: HistoryEntry;
    };
} | {
    type: 'history/remove';
    payload: {
        id: EntityId;
    };
} | {
    type: 'state/replace';
    payload: {
        state: import('./entities').DomainState;
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
    today(): string;
}
