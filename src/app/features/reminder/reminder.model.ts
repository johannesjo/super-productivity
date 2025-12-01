// TODO implement recurring reminders

export type RecurringConfig = Readonly<Record<string, unknown>>;

export type ReminderType = 'NOTE' | 'TASK';

// make sure to keep in sync with model used in reminder.worker.ts
export interface ReminderCopy {
  id: string;
  remindAt: number;
  title: string;
  type: ReminderType;
  relatedId: string;
  recurringConfig?: RecurringConfig;
}

export type Reminder = Readonly<ReminderCopy>;
