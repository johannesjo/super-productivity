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
  TaskContinued,
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
  type: TimelineViewEntryType.Task | TimelineViewEntryType.ScheduledTask;
  data: TaskCopy;
}

interface TimelineViewEntryText extends TimelineViewEntryBase {
  type: TimelineViewEntryType.TaskContinued;
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

export type TimelineViewEntry = TimelineViewEntryTask | TimelineViewEntryText | TimelineViewEntryCustomEvent;
