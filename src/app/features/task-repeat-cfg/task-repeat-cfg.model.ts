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

export interface TaskRepeatCfgCopy {
  id: string;
  projectId: string | null;
  lastTaskCreation: number;
  title: string | null;
  defaultEstimate: number | undefined;
  startTime: string | undefined;
  remindAt: TaskReminderOptionId | undefined;
  tagIds: string[];
  order: number;

  // actual repeat cfg fields
  isPaused: boolean;
  repeatCycle: RepeatCycleOption;
  // worklog string; only in effect for monthly/yearly
  startDate: string | undefined;
  repeatEvery: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
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
};
