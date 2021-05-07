export enum TimelineViewEntryType {
  Task = 'Task',
  ScheduledTask = 'ScheduledTask',
  SplitTask = 'SplitTask',
  SplitTaskContinued = 'SplitTaskContinued',
  SplitTaskContinuedLast = 'SplitTaskContinuedLast',
  CustomEvent = 'CustomEvent',
  WorkdayStart = 'WorkdayStart',
  WorkdayEnd = 'WorkdayEnd',
}

export const TimelineViewTypeOrder: {
  [key: string]: number;
} = {
  [TimelineViewEntryType.WorkdayStart]: 1,
  [TimelineViewEntryType.ScheduledTask]: 2,
  [TimelineViewEntryType.CustomEvent]: 2,
  [TimelineViewEntryType.Task]: 3,
  [TimelineViewEntryType.SplitTask]: 4,
  [TimelineViewEntryType.SplitTaskContinued]: 5,
  [TimelineViewEntryType.SplitTaskContinuedLast]: 6,
  [TimelineViewEntryType.WorkdayEnd]: 7,
};
