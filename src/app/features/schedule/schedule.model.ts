import { ScheduleViewEntryType } from './schedule.const';
import { TaskCopy } from '../tasks/task.model';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';
import { CalendarIntegrationEvent } from '../calendar-integration/calendar-integration.model';

export interface ScheduleEvent {
  id: string;
  title: string;
  type: ScheduleViewEntryType;
  style: string;
  startHours: number;
  timeLeftInHours: number;
  data?: ScheduleViewEntry['data'];
}

export interface ScheduleDay {
  dayDate: string;
  entries: ScheduleViewEntry[];
  beyondBudgetTasks: TaskCopy[];
  isToday: boolean;
}

interface ScheduleViewEntryBase {
  id: string;
  type: ScheduleViewEntryType;
  start: number;
  isHideTime?: boolean;
}

export interface ScheduleViewEntryTask extends ScheduleViewEntryBase {
  type:
    | ScheduleViewEntryType.Task
    | ScheduleViewEntryType.TaskPlannedForDay
    | ScheduleViewEntryType.ScheduledTask;
  data: TaskCopy;
}

export interface ScheduleViewEntrySplitTaskStart extends ScheduleViewEntryBase {
  type: ScheduleViewEntryType.SplitTaskPlannedForDay | ScheduleViewEntryType.SplitTask;
  data: TaskCopy;
  timeToGo: number;
}

export interface ScheduleViewEntryTaskPlannedForDay extends ScheduleViewEntryBase {
  type: ScheduleViewEntryType.TaskPlannedForDay;
  data: TaskCopy;
}

export interface ScheduleViewEntryScheduledRepeatProjection
  extends ScheduleViewEntryBase {
  type: ScheduleViewEntryType.ScheduledRepeatProjection;
  data: TaskRepeatCfg;
}

export interface ScheduleViewEntryRepeatProjection extends ScheduleViewEntryBase {
  type: ScheduleViewEntryType.RepeatProjection;
  data: TaskRepeatCfg;
}

export interface ScheduleViewEntryRepeatProjectionSplit extends ScheduleViewEntryBase {
  type: ScheduleViewEntryType.RepeatProjectionSplit;
  data: TaskRepeatCfg;
}

export interface ScheduleViewEntryRepeatProjectionSplitContinued
  extends ScheduleViewEntryBase {
  type:
    | ScheduleViewEntryType.RepeatProjectionSplitContinued
    | ScheduleViewEntryType.RepeatProjectionSplitContinuedLast;
  data: {
    title: string;
    timeToGo: number;
    repeatCfgId: string;
    index: number;
  };
}

export interface ScheduleViewEntrySplitTaskContinued extends ScheduleViewEntryBase {
  type:
    | ScheduleViewEntryType.SplitTaskContinued
    | ScheduleViewEntryType.SplitTaskContinuedLast;
  data: {
    title: string;
    timeToGo: number;
    taskId: string;
    projectId: string | null;
    index: number;
  };
}

export interface ScheduleFromCalendarEvent extends CalendarIntegrationEvent {
  icon?: string;
}

export interface ScheduleCustomEvent
  extends Omit<ScheduleFromCalendarEvent, 'calProviderId'> {
  icon: string;
}

interface ScheduleViewEntryCalendarEvent extends ScheduleViewEntryBase {
  type: ScheduleViewEntryType.CalendarEvent;
  data: ScheduleCustomEvent;
}

export interface ScheduleWorkStartEndCfg {
  startTime: string;
  endTime: string;
}

export interface ScheduleLunchBreakCfg {
  startTime: string;
  endTime: string;
}

interface ScheduleViewEntryWorkStart extends ScheduleViewEntryBase {
  type: ScheduleViewEntryType.WorkdayStart;
  data: ScheduleWorkStartEndCfg;
}

interface ScheduleViewEntryWorkEnd extends ScheduleViewEntryBase {
  type: ScheduleViewEntryType.WorkdayEnd;
  data: ScheduleWorkStartEndCfg;
}

interface ScheduleViewEntryLunchBreak extends ScheduleViewEntryBase {
  type: ScheduleViewEntryType.LunchBreak;
  data: ScheduleLunchBreakCfg;
}

export type ScheduleViewEntry =
  | ScheduleViewEntryTask
  | ScheduleViewEntrySplitTaskStart
  | ScheduleViewEntryTaskPlannedForDay
  | ScheduleViewEntryScheduledRepeatProjection
  | ScheduleViewEntryRepeatProjection
  | ScheduleViewEntryRepeatProjectionSplit
  | ScheduleViewEntryRepeatProjectionSplitContinued
  | ScheduleViewEntrySplitTaskContinued
  | ScheduleViewEntryCalendarEvent
  | ScheduleViewEntryWorkStart
  | ScheduleViewEntryWorkEnd
  | ScheduleViewEntryLunchBreak;

// // -----------------
// // BlockedBlocks
// export enum BlockedBlockType {
//   ScheduledTask = 'ScheduledTask',
//   ScheduledRepeatProjection = 'ScheduledRepeatProjection',
//   CalendarEvent = 'CalendarEvent',
//   WorkdayStartEnd = 'WorkdayStartEnd',
//   LunchBreak = 'LunchBreak',
// }
//
// export interface BlockedBlockEntryScheduledTask {
//   start: number;
//   end: number;
//   type: BlockedBlockType.ScheduledTask;
//   data: TaskPlanned;
// }
//
// export interface BlockedBlockEntryScheduledRepeatProjection {
//   start: number;
//   end: number;
//   type: BlockedBlockType.ScheduledRepeatProjection;
//   data: TaskRepeatCfg;
// }
//
// export interface BlockedBlockEntryCalendarEvent {
//   start: number;
//   end: number;
//   type: BlockedBlockType.CalendarEvent;
//   data: ScheduleFromCalendarEvent;
// }
//
// export interface BlockedBlockEntryWorkdayStartEnd {
//   start: number;
//   end: number;
//   type: BlockedBlockType.WorkdayStartEnd;
//   data: ScheduleWorkStartEndCfg;
// }
//
// export interface BlockedBlockEntryLunchBreak {
//   start: number;
//   end: number;
//   type: BlockedBlockType.LunchBreak;
//   data: ScheduleLunchBreakCfg;
// }
//
// export type BlockedBlockEntry =
//   | BlockedBlockEntryScheduledTask
//   | BlockedBlockEntryScheduledRepeatProjection
//   | BlockedBlockEntryCalendarEvent
//   | BlockedBlockEntryWorkdayStartEnd
//   | BlockedBlockEntryLunchBreak;
//
// export interface BlockedBlock {
//   start: number;
//   end: number;
//   entries: BlockedBlockEntry[];
// }
