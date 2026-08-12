import type { ClockPort, FocusPulse } from './ports';
export type { FocusPulse };
export interface TrackingReminderOptions {
    clock: ClockPort;
    /** Returns the current focus state. */
    state: () => FocusPulse;
    /** Called when a tracking-reminder is due for the active entry. */
    onReminder: (entryId: string) => void;
}
/**
 * Tracking-reminder: when the user keeps time-tracking past
 * `trackingReminderMinutes` without interruption, nudge them. Fires at most
 * once per active entry, reset when a new entry starts.
 */
export declare class TrackingReminder {
    #private;
    constructor(options: TrackingReminderOptions);
    check(trackingReminderMinutes: number): void;
}
