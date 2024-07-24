import { TaskCopy, TaskPlanned } from '../tasks/task.model';
import { TimelineViewEntryType } from './timeline.const';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';
import { CalendarIntegrationEvent } from '../calendar-integration/calendar-integration.model';

export interface TimelineDay {
  dayDate: string;
  entries: TimelineViewEntry[];
  beyondBudgetTasks: TaskCopy[];
  isToday: boolean;
}

export interface BlockedBlockByDayMap {
  [dayDate: string]: BlockedBlock[];
}

interface TimelineViewEntryBase {
  id: string;
  type: TimelineViewEntryType;
  start: number;
  isHideTime?: boolean;
}

export interface TimelineViewEntryTask extends TimelineViewEntryBase {
  type:
    | TimelineViewEntryType.Task
    | TimelineViewEntryType.TaskPlannedForDay
    | TimelineViewEntryType.ScheduledTask
    | TimelineViewEntryType.SplitTaskPlannedForDay
    | TimelineViewEntryType.SplitTask;
  data: TaskCopy;
}

export interface TimelineViewEntryTaskPlannedForDay extends TimelineViewEntryBase {
  type: TimelineViewEntryType.TaskPlannedForDay;
  data: TaskCopy;
}

export interface TimelineViewEntryScheduledRepeatProjection
  extends TimelineViewEntryBase {
  type: TimelineViewEntryType.ScheduledRepeatProjection;
  data: TaskRepeatCfg;
}

export interface TimelineViewEntryRepeatProjection extends TimelineViewEntryBase {
  type: TimelineViewEntryType.RepeatProjection;
  data: TaskRepeatCfg;
}

export interface TimelineViewEntryRepeatProjectionSplit extends TimelineViewEntryBase {
  type: TimelineViewEntryType.RepeatProjectionSplit;
  data: TaskRepeatCfg;
}

export interface TimelineViewEntryRepeatProjectionSplitContinued
  extends TimelineViewEntryBase {
  type:
    | TimelineViewEntryType.RepeatProjectionSplitContinued
    | TimelineViewEntryType.RepeatProjectionSplitContinuedLast;
  data: {
    title: string;
    timeToGo: number;
    repeatCfgId: string;
    index: number;
  };
}

export interface TimelineViewEntrySplitTaskContinued extends TimelineViewEntryBase {
  type:
    | TimelineViewEntryType.SplitTaskContinued
    | TimelineViewEntryType.SplitTaskContinuedLast;
  data: {
    title: string;
    timeToGo: number;
    taskId: string;
    index: number;
  };
}

export interface TimelineFromCalendarEvent extends CalendarIntegrationEvent {
  icon?: string;
}

export interface TimelineCustomEvent
  extends Omit<TimelineFromCalendarEvent, 'calProviderId'> {
  icon: string;
}

interface TimelineViewEntryCustomEvent extends TimelineViewEntryBase {
  type: TimelineViewEntryType.CustomEvent;
  data: TimelineCustomEvent;
}

interface TimelineViewEntryCalendarEvent extends TimelineViewEntryBase {
  type: TimelineViewEntryType.CalendarEvent;
  data: TimelineCustomEvent;
}

export interface TimelineWorkStartEndCfg {
  startTime: string;
  endTime: string;
}

export interface TimelineLunchBreakCfg {
  startTime: string;
  endTime: string;
}

interface TimelineViewEntryWorkStart extends TimelineViewEntryBase {
  type: TimelineViewEntryType.WorkdayStart;
  data: TimelineWorkStartEndCfg;
}

interface TimelineViewEntryWorkEnd extends TimelineViewEntryBase {
  type: TimelineViewEntryType.WorkdayEnd;
  data: TimelineWorkStartEndCfg;
}

interface TimelineViewEntryLunchBreak extends TimelineViewEntryBase {
  type: TimelineViewEntryType.LunchBreak;
  data: TimelineLunchBreakCfg;
}

export interface TimelineDayCrossing extends TimelineViewEntryBase {
  type: TimelineViewEntryType.DayCrossing;
  data?: undefined;
}

export type TimelineViewEntry =
  | TimelineViewEntryTask
  | TimelineViewEntryTaskPlannedForDay
  | TimelineViewEntryScheduledRepeatProjection
  | TimelineViewEntryRepeatProjection
  | TimelineViewEntryRepeatProjectionSplit
  | TimelineViewEntryRepeatProjectionSplitContinued
  | TimelineViewEntrySplitTaskContinued
  | TimelineViewEntryCustomEvent
  | TimelineViewEntryCalendarEvent
  | TimelineViewEntryWorkStart
  | TimelineViewEntryWorkEnd
  | TimelineViewEntryLunchBreak
  | TimelineDayCrossing;

// -----------------
// BlockedBlocks
export enum BlockedBlockType {
  ScheduledTask = 'ScheduledTask',
  ScheduledRepeatProjection = 'ScheduledRepeatProjection',
  CalendarEvent = 'CalendarEvent',
  WorkdayStartEnd = 'WorkdayStartEnd',
  LunchBreak = 'LunchBreak',
}

export interface BlockedBlockEntryScheduledTask {
  start: number;
  end: number;
  type: BlockedBlockType.ScheduledTask;
  data: TaskPlanned;
}

export interface BlockedBlockEntryScheduledRepeatProjection {
  start: number;
  end: number;
  type: BlockedBlockType.ScheduledRepeatProjection;
  data: TaskRepeatCfg;
}

export interface BlockedBlockEntryCalendarEvent {
  start: number;
  end: number;
  type: BlockedBlockType.CalendarEvent;
  data: TimelineFromCalendarEvent;
}

export interface BlockedBlockEntryWorkdayStartEnd {
  start: number;
  end: number;
  type: BlockedBlockType.WorkdayStartEnd;
  data: TimelineWorkStartEndCfg;
}

export interface BlockedBlockEntryLunchBreak {
  start: number;
  end: number;
  type: BlockedBlockType.LunchBreak;
  data: TimelineLunchBreakCfg;
}

export type BlockedBlockEntry =
  | BlockedBlockEntryScheduledTask
  | BlockedBlockEntryScheduledRepeatProjection
  | BlockedBlockEntryCalendarEvent
  | BlockedBlockEntryWorkdayStartEnd
  | BlockedBlockEntryLunchBreak;

export interface BlockedBlock {
  start: number;
  end: number;
  entries: BlockedBlockEntry[];
}

export interface TimelineCalendarMapEntry {
  icon: string;
  items: TimelineFromCalendarEvent[];
}
