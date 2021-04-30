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
  WorkdayEnd,
}

interface TimelineViewEntryBase {
  id: string;
  type: TimelineViewEntryType;
  time: number | null;
  isSameTimeAsPrevious: boolean;
}

interface TimelineViewEntryTask extends TimelineViewEntryBase {
  type: TimelineViewEntryType.Task | TimelineViewEntryType.ScheduledTask | TimelineViewEntryType.SplitTask;
  data: TaskCopy;
}

interface TimelineViewEntrySplitTaskContinued extends TimelineViewEntryBase {
  type: TimelineViewEntryType.SplitTaskContinued;
  data: string;
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

export type TimelineViewEntry =
  TimelineViewEntryTask
  | TimelineViewEntrySplitTaskContinued
  | TimelineViewEntryCustomEvent;
