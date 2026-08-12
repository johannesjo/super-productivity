/**
 * Framework-free reminder scheduler. Poll-safe: a reminder fires at most once
 * per (taskId, reminderAt) even if `check()` runs repeatedly, and reminders are
 * only reported when their instant has passed and the global config enables
 * them. Deterministic against the injected clock.
 */
export class ReminderScheduler {
    #clock;
    #loadTasks;
    #onReminder;
    #isEnabled;
    #fired = new Set();
    constructor(options) {
        this.#clock = options.clock;
        this.#loadTasks =
            options.loadTasks ?? ((state) => Object.values(state.tasks));
        this.#onReminder = options.onReminder;
        this.#isEnabled = options.isEnabled ?? (() => true);
    }
    /** Reports every not-yet-fired reminder whose instant <= now. */
    check(state) {
        if (!this.#isEnabled(state))
            return;
        const now = this.#clock.now();
        for (const task of this.#loadTasks(state)) {
            const reminderAt = task.reminderAt;
            if (task.status === 'done' || !reminderAt)
                continue;
            const atoms = Date.parse(reminderAt);
            if (Number.isNaN(atoms) || atoms > now)
                continue;
            const key = this.#key(task.id, reminderAt);
            if (this.#fired.has(key))
                continue;
            this.#fired.add(key);
            this.#onReminder(task, [atoms]);
        }
    }
    /** Forget fired reminders for tasks that were edited (e.g. after snooze). */
    acknowledge(taskId, reminderAt) {
        this.#fired.add(this.#key(taskId, reminderAt));
    }
    #key(taskId, reminderAt) {
        return `${taskId}::${reminderAt}`;
    }
}
