import type { DomainState, Task } from '@noura/domain';
import type { ClockPort } from './ports';
export interface ReminderSchedulerOptions {
    clock: ClockPort;
    /** Returns the tasks that may carry due reminders (defaults to all). */
    loadTasks?: (state: DomainState) => Task[];
    /** Called once per task whose reminder fires. Idempotent per reminderAt. */
    onReminder: (task: Task, reminders: number[]) => void;
    /** Whether reminders are enabled at all (from GlobalConfig). */
    isEnabled?: (state: DomainState) => boolean;
}
/**
 * Framework-free reminder scheduler. Poll-safe: a reminder fires at most once
 * per (taskId, reminderAt) even if `check()` runs repeatedly, and reminders are
 * only reported when their instant has passed and the global config enables
 * them. Deterministic against the injected clock.
 */
export declare class ReminderScheduler {
    #private;
    constructor(options: ReminderSchedulerOptions);
    /** Reports every not-yet-fired reminder whose instant <= now. */
    check(state: DomainState): void;
    /** Forget fired reminders for tasks that were edited (e.g. after snooze). */
    acknowledge(taskId: string, reminderAt: string): void;
}
