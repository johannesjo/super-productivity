import { TaskCopy } from '../tasks/task.model';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';

export enum ScheduleItemType {
  Task = 'Task',
  CalEvent = 'CalEvent',
  RepeatProjection = 'RepeatProjection',
}

export interface WeekPlannerDay {
  dayDate: string;
  timeEstimate: number;
  timeLimit: number;
  tasks: TaskCopy[];
  scheduledIItems: ScheduleItem[];
}

export interface ScheduleItemBase {
  id: string;
  type: ScheduleItemType;
  start: number;
  end: number;
}

export interface ScheduleItemTask extends ScheduleItemBase {
  type: ScheduleItemType.Task;
  task: TaskCopy;
}

export interface ScheduleItemRepeatProjection extends ScheduleItemBase {
  type: ScheduleItemType.RepeatProjection;
  repeatCfg: TaskRepeatCfg;
}

export interface ScheduleItemEvent extends ScheduleItemBase {
  type: ScheduleItemType.CalEvent;
  ico?: string;
}

export type ScheduleItem =
  | ScheduleItemTask
  | ScheduleItemEvent
  | ScheduleItemRepeatProjection;
