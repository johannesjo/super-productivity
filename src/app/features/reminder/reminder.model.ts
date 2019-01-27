// TODO implement recurring reminders
export type RecurringConfig = Readonly<{}>;

export type ReminderType = 'NOTE' | 'TASK';

export interface ReminderCopy {
  id: string;
  projectId: string;
  remindAt: number;
  title: string;
  type: ReminderType;
  relatedId: string;
  recurringConfig?: RecurringConfig;
}

export type Reminder = Readonly<ReminderCopy>;
