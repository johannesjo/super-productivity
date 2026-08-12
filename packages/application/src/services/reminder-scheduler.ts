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
export class ReminderScheduler {
  readonly #clock: ClockPort;
  readonly #loadTasks: (state: DomainState) => Task[];
  readonly #onReminder: (task: Task, reminders: number[]) => void;
  readonly #isEnabled: (state: DomainState) => boolean;
  readonly #fired = new Set<string>();

  constructor(options: ReminderSchedulerOptions) {
    this.#clock = options.clock;
    this.#loadTasks =
      options.loadTasks ?? ((state: DomainState) => Object.values(state.tasks));
    this.#onReminder = options.onReminder;
    this.#isEnabled = options.isEnabled ?? (() => true);
  }

  /** Reports every not-yet-fired reminder whose instant <= now. */
  check(state: DomainState): void {
    if (!this.#isEnabled(state)) return;
    const now = this.#clock.now();
    for (const task of this.#loadTasks(state)) {
      const reminderAt = task.reminderAt;
      if (task.status === 'done' || !reminderAt) continue;
      const atoms = Date.parse(reminderAt);
      if (Number.isNaN(atoms) || atoms > now) continue;
      const key = this.#key(task.id, reminderAt);
      if (this.#fired.has(key)) continue;
      this.#fired.add(key);
      this.#onReminder(task, [atoms]);
    }
  }

  /** Forget fired reminders for tasks that were edited (e.g. after snooze). */
  acknowledge(taskId: string, reminderAt: string): void {
    this.#fired.add(this.#key(taskId, reminderAt));
  }

  #key(taskId: string, reminderAt: string): string {
    return `${taskId}::${reminderAt}`;
  }
}
