export enum TimelineViewEntryType {
  Task = 'Task',
  ScheduledTask = 'ScheduledTask',
  ScheduledRepeatTaskProjection = 'ScheduledRepeatTaskProjection',
  SplitTask = 'SplitTask',
  SplitTaskContinued = 'SplitTaskContinued',
  SplitTaskContinuedLast = 'SplitTaskContinuedLast',
  CustomEvent = 'CustomEvent',
  WorkdayStart = 'WorkdayStart',
  WorkdayEnd = 'WorkdayEnd',
  DayCrossing = 'DayCrossing',
}

export const TIMELINE_VIEW_TYPE_ORDER: {
  [key: string]: number;
} = {
  [TimelineViewEntryType.WorkdayStart]: 1,
  [TimelineViewEntryType.ScheduledTask]: 2,
  [TimelineViewEntryType.ScheduledRepeatTaskProjection]: 2,
  [TimelineViewEntryType.CustomEvent]: 2,
  [TimelineViewEntryType.Task]: 3,
  [TimelineViewEntryType.SplitTask]: 4,
  [TimelineViewEntryType.SplitTaskContinued]: 5,
  [TimelineViewEntryType.SplitTaskContinuedLast]: 6,
  [TimelineViewEntryType.WorkdayEnd]: 7,
};

export const TIMELINE_MOVEABLE_TYPES: TimelineViewEntryType[] = [
  TimelineViewEntryType.Task,
  TimelineViewEntryType.SplitTask,
  TimelineViewEntryType.SplitTaskContinued,
  TimelineViewEntryType.SplitTaskContinuedLast,
];
