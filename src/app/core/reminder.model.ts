// TODO implement recurring reminders
export type RecurringConfig = Readonly<{}>;

export type Reminder = Readonly<{
  id: string;
  projectId: string;
  remindAt: number;
  noteId?: string;
  taskId?: string;
  recurringConfig?: RecurringConfig;
}>;
