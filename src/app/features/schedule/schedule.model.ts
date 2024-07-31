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
  timeToGo: number;
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

export type ScheduleLunchBreakCfg = ScheduleWorkStartEndCfg;

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
