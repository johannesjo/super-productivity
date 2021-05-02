import { TaskCopy } from '../tasks/task.model';

// export enum TimelineEntryType {
//   Task,
//   Event,
//   Break,
//   DayEnd,
// }

export enum TimelineViewEntryType {
  Task,
  ScheduledTask,
  SplitTask,
  SplitTaskContinued,
  CustomEvent,
  WorkdayStart,
  WorkdayEnd,
}

interface TimelineViewEntryBase {
  id: string;
  type: TimelineViewEntryType;
  time: number | null;
  isHideTime: boolean;
}

interface TimelineViewEntryTask extends TimelineViewEntryBase {
  type: TimelineViewEntryType.Task | TimelineViewEntryType.ScheduledTask | TimelineViewEntryType.SplitTask;
  data: TaskCopy;
}

interface TimelineViewEntrySplitTaskContinued extends TimelineViewEntryBase {
  type: TimelineViewEntryType.SplitTaskContinued;
  data: {
    title: string;
    timeToGo: number;
  };
}

export interface TimelineCustomEvent {
  title: string;
  start: number;
  duration: number;
  icon: string;
}

interface TimelineViewEntryCustomEvent extends TimelineViewEntryBase {
  type: TimelineViewEntryType.CustomEvent;
  data: TimelineCustomEvent;
}


export interface TimelineWorkStartEndCfg {
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

export type TimelineViewEntry =
  TimelineViewEntryTask
  | TimelineViewEntrySplitTaskContinued
  | TimelineViewEntryCustomEvent
  | TimelineViewEntryWorkStart
  | TimelineViewEntryWorkEnd
  ;


