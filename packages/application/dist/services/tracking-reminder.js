/**
 * Tracking-reminder: when the user keeps time-tracking past
 * `trackingReminderMinutes` without interruption, nudge them. Fires at most
 * once per active entry, reset when a new entry starts.
 */
export class TrackingReminder {
    #clock;
    #state;
    #onReminder;
    #remindedFor;
    constructor(options) {
        this.#clock = options.clock;
        this.#state = options.state;
        this.#onReminder = options.onReminder;
    }
    check(trackingReminderMinutes) {
        if (trackingReminderMinutes <= 0)
            return;
        const pulse = this.#state();
        if (!pulse.activeEntryId || pulse.startedAt === undefined) {
            this.#remindedFor = undefined;
            return;
        }
        if (this.#remindedFor === pulse.activeEntryId)
            return;
        const thresholdMs = trackingReminderMinutes * 60_000;
        if (this.#clock.now() - pulse.startedAt >= thresholdMs) {
            this.#remindedFor = pulse.activeEntryId;
            this.#onReminder(pulse.activeEntryId);
        }
    }
}
