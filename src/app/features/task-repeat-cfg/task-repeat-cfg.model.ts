import {EntityState} from '@ngrx/entity';

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
  projectId: string;
  lastTaskCreation: number;
  title: string;
  defaultEstimate: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  tagIds: string[];
}

export type TaskRepeatCfg = Readonly<TaskRepeatCfgCopy>;

export interface TaskRepeatCfgState extends EntityState<TaskRepeatCfg> {
  // additional entities state properties
}

export const DEFAULT_TASK_REPEAT_CFG: TaskRepeatCfgCopy = {
  id: undefined,
  projectId: undefined,
  lastTaskCreation: Date.now(),
  // lastTaskCreation: Date.now() - 24 * 60 * 60 * 1000,
  title: undefined,
  defaultEstimate: undefined,
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
  tagIds: [],
};
