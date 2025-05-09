import { EntityState } from '@ngrx/entity';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { TaskReminderOptionId } from '../tasks/task.model';

export const TASK_REPEAT_WEEKDAY_MAP: (keyof TaskRepeatCfg)[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export type RepeatCycleOption = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RepeatQuickSetting =
  | 'DAILY'
  | 'WEEKLY_CURRENT_WEEKDAY'
  | 'MONTHLY_CURRENT_DATE'
  | 'MONDAY_TO_FRIDAY'
  | 'YEARLY_CURRENT_DATE'
  | 'CUSTOM';

export interface TaskRepeatCfgCopy {
  id: string;
  projectId: string | null;
  lastTaskCreation: number;
  title: string | null;
  tagIds: string[];
  order: number;
  defaultEstimate?: number;
  startTime?: string;
  remindAt?: TaskReminderOptionId;

  // actual repeat cfg fields
  isPaused: boolean;
  // has no direct effect, but is used to update values inside form
  quickSetting: RepeatQuickSetting;
  repeatCycle: RepeatCycleOption;
  // worklog string; only in effect for monthly/yearly
  startDate?: string;
  repeatEvery: number;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;

  // advanced
  notes: string | undefined;
  // ... possible sub tasks & attachments
}

export type TaskRepeatCfg = Readonly<TaskRepeatCfgCopy>;

export interface TaskRepeatCfgState extends EntityState<TaskRepeatCfg> {
  // additional entities state properties
  [MODEL_VERSION_KEY]?: number;
}

export const DEFAULT_TASK_REPEAT_CFG: Omit<TaskRepeatCfgCopy, 'id'> = {
  lastTaskCreation: Date.now(),
  title: null,
  defaultEstimate: undefined,

  // id: undefined,
  projectId: null,
  // lastTaskCreation: Date.now() - 24 * 60 * 60 * 1000,

  startTime: undefined,
  startDate: undefined,
  repeatEvery: 1,
  remindAt: undefined,
  isPaused: false,
  quickSetting: 'DAILY',
  repeatCycle: 'WEEKLY',
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
  tagIds: [],
  order: 0,

  notes: undefined,
};
