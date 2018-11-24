// TODO implement recurring reminders
export type RecurringConfig = Readonly<{}>;

export type ReminderType = 'NOTE' | 'TASK';

export type Reminder = Readonly<{
  id: string;
  projectId: string;
  remindAt: number;
  type: ReminderType;
  relatedId: string;
  recurringConfig?: RecurringConfig;
}>;
