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
/** A named subdivision of a task that groups the task's passing subtasks. */
export interface TaskSection {
    id: EntityId;
    title: string;
    taskIds: EntityId[];
}
export interface Task {
    id: EntityId;
    title: string;
    notes: string;
    status: TaskStatus;
    priority: TaskPriority;
    projectId: EntityId;
    parentId?: EntityId;
    subtaskIds: EntityId[];
    tagIds: EntityId[];
    checklist: ChecklistItem[];
    sections: TaskSection[];
    attachments: Attachment[];
    issue?: IssueRef;
    dueDay?: ISODate;
    dueAt?: string;
    start?: ISODate;
    startAt?: string;
    repeatCfgId?: EntityId;
    repeatRule?: string;
    reminderAt?: string;
    estimateMs: number;
    trackedMs: number;
    createdAt: number;
    updatedAt: number;
    doneOn?: number;
    order: number;
}
export interface Project {
    id: EntityId;
    title: string;
    color: string;
    icon: string;
    archived: boolean;
    theme?: {
        primary?: string;
    };
    issueIntegrationCfg?: unknown;
    taskCfg?: unknown;
    createdAt: number;
}
export interface Tag {
    id: EntityId;
    title: string;
    color: string;
}
export type RecurrenceUnit = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export interface RepeatEveryConfig {
    repeatEvery: number;
    repeatEveryUnit: RecurrenceUnit;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    weekOfMonth?: number;
    yearMonth?: number;
    repeatOffset?: number;
}
export interface TaskRepeatCfg {
    id: EntityId;
    title: string;
    repeatEvery: number;
    repeatEveryUnit: RecurrenceUnit;
    daysOfWeek: number[];
    dayOfMonth?: number;
    weekOfMonth?: number;
    yearMonth?: number;
    repeatOffset: number;
    startDate?: ISODate;
    endDate?: ISODate;
    lastDay?: ISODate;
    createdAt: number;
    modifiedAt: number;
}
export interface NoteBookmark {
    id: EntityId;
    noteId: EntityId;
    path: string;
    createdAt: number;
    modifiedAt: number;
}
export interface Note {
    id: EntityId;
    projectId: EntityId;
    content: string;
    bookmarks: NoteBookmark[];
    attachments: Attachment[];
    createdAt: number;
    modifiedAt: number;
}
/** A fixed start/end time entry against a task (timer-recorded or manual). */
export interface TrackedEntry {
    id: EntityId;
    taskId?: EntityId;
    mode: 'pomodoro' | 'flowtime' | 'stopwatch';
    startedAt: number;
    endedAt?: number;
    durationMs: number;
    date?: ISODate;
    notes?: string;
    source: 'timer' | 'manual';
    updatedAt: number;
}
/** @deprecated renamed to TrackedEntry; kept as an alias for compatibility. */
export type TimeSession = TrackedEntry;
export interface Worklog {
    id: EntityId;
    taskId?: EntityId;
    started: number;
    ended: number;
    duration: number;
    date?: ISODate;
    notes?: string;
    createdAt: number;
    modifiedAt: number;
}
export type CounterType = 'STOPWATCH' | 'COUNTER';
export interface SimpleCounter {
    id: EntityId;
    title: string;
    counterType: CounterType;
    counterOn: boolean;
    startedOn?: ISODate;
    startedAt?: number;
    counterValue: number;
    createdAt: number;
    modifiedAt: number;
}
export interface WorkContext {
    id: EntityId;
    title: string;
    icon: string;
    isEnabled: boolean;
    isPersistent: boolean;
    taskIds: EntityId[];
    createdAt: number;
    modifiedAt: number;
}
export interface IssueProviderCfg {
    id: EntityId;
    providerId: string;
    cfg?: {
        apiHost?: string;
        userName?: string;
        hasPassword?: boolean;
    };
    enabled: boolean;
    isNotifyOnNewIssueToMe: boolean;
    isShowIssueId: boolean;
    isShowTimeTracking: boolean;
    createdAt: number;
    modifiedAt: number;
}
export type ThemeMode = 'light' | 'dark' | 'system';
export interface GlobalConfig {
    id: EntityId;
    themeMode: ThemeMode;
    language: string;
    dateFormat: string;
    timeFormat: string;
    weekStartDay: number;
    isReduceMotion: boolean;
    defaultProjectId?: EntityId;
    /** User profile display name (user profile, kept on-device). */
    name: string;
    isEnableReminders: boolean;
    isEnableTrackingReminder: boolean;
    trackingReminderMinute: number;
    isEnableTakeABreak: boolean;
    takeABreakMinute: number;
    isEnableIdleDetection: boolean;
    isEnablePomodoroAutoStartBreak: boolean;
    isEnablePomodoroAutoStartNext: boolean;
    workStartHour: number;
    workEndHour: number;
    isBlockFinishDayForTimeTrackingTasks: boolean;
    isKeepNotesOnToday: boolean;
    /** Keyboard shortcut bindings (command id -> accelerator). */
    shortcutBindings: Record<string, string>;
    /** Dismissed the welcome/onboarding tour at least once. */
    isOnboardingComplete: boolean;
}
/** Default accelerator per shortcut command id (see Settings → Shortcuts). */
export declare const DEFAULT_SHORTCUTS: Record<string, string>;
export interface TaskViewConfig {
    id: EntityId;
    viewId: EntityId;
    isShowNotes: boolean;
    isShowChecklist: boolean;
    isShowTags: boolean;
    isShowAttachment: boolean;
    isShowSubTasks: boolean;
    isShowDoneToday: boolean;
    isShowBacklog: boolean;
    isHideDone: boolean;
    displayDoneTasks: number;
    isShowTaskNumber: boolean;
    isShowMinutesSpent: boolean;
}
export type FilterCriteriaType = 'DUE' | 'PRIORITY' | 'PROJECT' | 'TAG' | 'TIME_ESTIMATE' | 'TEXT' | 'IS_DONE';
export interface FilterCriteria {
    type: FilterCriteriaType;
    value: string;
}
export interface SmartListCriteria {
    isShowCompletedTasks: boolean;
    filterCriteria: FilterCriteria[];
}
export interface SmartList {
    id: EntityId;
    title: string;
    order: number;
    listConfig: SmartListCriteria;
    createdAt: number;
    modifiedAt: number;
}
export interface HistoryEntry {
    id: EntityId;
    date: ISODate;
    totalTimeSpent: number;
    totalTimeEstimate: number;
    tasksDone: number;
    resets: number;
    createdAt: number;
}
/** A snapshot of an archived task, kept in the young/old archive buckets. */
export interface TaskArchiveRecord {
    id: EntityId;
    bucket: 'young' | 'old';
    task: Task;
    archivedOn: number;
}
export interface DomainState {
    schemaVersion: 2;
    tasks: Record<EntityId, Task>;
    projects: Record<EntityId, Project>;
    tags: Record<EntityId, Tag>;
    trackedEntries: Record<EntityId, TrackedEntry>;
    taskRepeatCfgs: Record<EntityId, TaskRepeatCfg>;
    notes: Record<EntityId, Note>;
    worklogs: Record<EntityId, Worklog>;
    counters: Record<EntityId, SimpleCounter>;
    workContexts: Record<EntityId, WorkContext>;
    issueProviders: Record<EntityId, IssueProviderCfg>;
    taskViewConfigs: Record<EntityId, TaskViewConfig>;
    smartLists: Record<EntityId, SmartList>;
    history: Record<EntityId, HistoryEntry>;
    archives: Record<EntityId, TaskArchiveRecord>;
    config: GlobalConfig;
    taskOrder: EntityId[];
    selectedTaskId?: EntityId;
    activeProjectId: EntityId;
    activeWorkContextId?: EntityId;
    focusedWorkContextId?: EntityId;
    activeSessionId?: EntityId;
}
export declare const INBOX_PROJECT_ID = "inbox";
export declare const DEFAULT_WORK_CONTEXT_ID = "default";
export declare const createDefaultConfig: (now?: number) => GlobalConfig;
export declare const createDefaultTaskViewConfig: (viewId: EntityId, now?: number) => TaskViewConfig;
export declare const createInitialState: (now?: number) => DomainState;
