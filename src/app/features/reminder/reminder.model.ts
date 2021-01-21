// TODO implement recurring reminders
import { WorkContextType } from '../work-context/work-context.model';

export type RecurringConfig = Readonly<Record<string, unknown>>;

export type ReminderType = 'NOTE' | 'TASK';

// make sure to keep in sync with with model used in reminder.worker.ts
export interface ReminderCopy {
  id: string;
  // projectId: string;
  workContextId: string;
  workContextType: WorkContextType;
  remindAt: number;
  title: string;
  type: ReminderType;
  relatedId: string;
  recurringConfig?: RecurringConfig;
}

export type Reminder = Readonly<ReminderCopy>;
