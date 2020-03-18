// TODO implement recurring reminders
import {WorkContextType} from '../work-context/work-context.model';

export type RecurringConfig = Readonly<{}>;

export type ReminderType = 'NOTE' | 'TASK';

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
