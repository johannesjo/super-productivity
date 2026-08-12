import { type DomainCommand, type DomainState, type ISODate } from '@noura/domain';
/** `today` advanced by one ISO day (UTC-safe). */
export declare const nextDay: (today: ISODate) => ISODate;
/**
 * Finish-day summary: the daily history entry recording what the day produced.
 * Returns the single `history/record` command that makes the day durable.
 * Deterministic against `state` and `today`.
 */
export declare const buildFinishDayCommand: (state: DomainState, today: ISODate) => DomainCommand[];
/**
 * Plan-tomorrow strategy: open, overdue, non-repeating tasks are carried
 * forward to `tomorrow` so the next day starts with a plan. Returns the
 * `task/update` batch (the caller decides when to apply it).
 */
export declare const buildPlanCommands: (state: DomainState, today: ISODate) => DomainCommand[];
/**
 * Morning review: surfaces the tasks that still need attention today — open
 * tasks due today plus overdue ones that have not been replanned yet. Pure
 * projection, no commands.
 */
export declare const morningReview: (state: DomainState, today: ISODate) => {
    overdue: import("@noura/domain").Task[];
    dueToday: import("@noura/domain").Task[];
    count: number;
};
