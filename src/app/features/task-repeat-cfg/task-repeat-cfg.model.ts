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

export interface TaskRepeatCfgCopy {
  id: string;
  projectId: string | null;
  lastTaskCreation: number;
  title: string | null;
  defaultEstimate: number | undefined;
  // TODO migrate all existing to undefined
  startTime: string | undefined;
  remindAt: TaskReminderOptionId | undefined;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  isAddToBottom: boolean;
  tagIds: string[];
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
  remindAt: undefined,

  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
  isAddToBottom: false,
  tagIds: [],
};
