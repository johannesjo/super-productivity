import { type DomainCommand, type DomainState, type ISODate, type Task, type TrackedEntry } from '@noura/domain';
/**
 * Completion → history: when a task is toggled done, refresh the day summary
 * so the History view reflects the new completion as part of the same effect.
 * Deterministic against the state and the supplied logical completion time.
 */
export declare const buildCompletionHistoryCommand: (state: DomainState, task: Task, at: number) => DomainCommand[];
/**
 * Focus-day summary → worklog: a finished tracked entry becomes a durable
 * worklog row. Returns zero commands for entries that are still running.
 */
export declare const buildWorklogCommand: (entry: TrackedEntry) => DomainCommand[];
/**
 * Focus-day summary: aggregates a day's tracked entries into the worklog
 * projection used by the timesheet view. Pure, no commands.
 */
export declare const focusDaySummary: (state: DomainState, day: ISODate) => {
    entries: TrackedEntry[];
    totalMs: number;
    count: number;
};
