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
  title: string;
  defaultEstimate: number;
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
}

export const DEFAULT_TASK_REPEAT_CFG: TaskRepeatCfgCopy = {
  id: undefined,
  title: undefined,
  defaultEstimate: undefined,
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
};
