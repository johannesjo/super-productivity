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

export interface CustomEvent {
  starts: number;
  duration: number;
}

interface TimelineViewEntryCustomEvent extends TimelineViewEntryBase {
  type: TimelineViewEntryType.CustomEvent;
  data: CustomEvent;
}

export type TimelineViewEntry =
  TimelineViewEntryTask
  | TimelineViewEntrySplitTaskContinued
  | TimelineViewEntryCustomEvent;
