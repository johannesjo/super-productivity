import { TaskCopy } from '../tasks/task.model';

export enum TimelineEntryType {
  Task,
  Event,
  Break,
  DayEnd,
}

export enum TimelineViewEntryType {
  TaskFull,
  TaskContinued,
  EventTask,
  Break,
  Now,
  WorkdayEnd,
  Text,
  // TaskStart,
  // TaskMiddle,
}

interface TimelineViewEntryBase {
  id: string;
  type: TimelineViewEntryType;
  time: number | null;
}

interface TimelineViewEntryTask extends TimelineViewEntryBase {
  type: TimelineViewEntryType.TaskFull | TimelineViewEntryType.TaskContinued | TimelineViewEntryType.EventTask;
  data: TaskCopy;
}

interface TimelineViewEntryText extends TimelineViewEntryBase {
  type: TimelineViewEntryType.Text;
  data: string;
}

export type TimelineViewEntry = TimelineViewEntryTask | TimelineViewEntryText;
