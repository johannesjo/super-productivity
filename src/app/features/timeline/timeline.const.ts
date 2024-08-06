export enum TimelineViewEntryType {
  Task = 'Task',
  TaskPlannedForDay = 'TaskPlannedForDay',
  ScheduledTask = 'ScheduledTask',
  RepeatProjection = 'RepeatProjection',
  RepeatProjectionSplit = 'RepeatProjectionSplit',
  RepeatProjectionSplitContinued = 'RepeatProjectionSplitContinued',
  RepeatProjectionSplitContinuedLast = 'RepeatProjectionSplitContinuedLast',
  ScheduledRepeatProjection = 'ScheduledRepeatProjection',
  SplitTask = 'SplitTask',
  SplitTaskPlannedForDay = 'SplitTaskPlannedForDay',
  SplitTaskContinued = 'SplitTaskContinued',
  SplitTaskContinuedLast = 'SplitTaskContinuedLast',
  CustomEvent = 'CustomEvent',
  CalendarEvent = 'CalendarEvent',
  WorkdayStart = 'WorkdayStart',
  WorkdayEnd = 'WorkdayEnd',
  DayCrossing = 'DayCrossing',
  LunchBreak = 'LunchBreak',
}

export const SCHEDULE_VIEW_TYPE_ORDER: {
  [key: string]: number;
} = {
  [TimelineViewEntryType.WorkdayStart]: 1,
  [TimelineViewEntryType.WorkdayEnd]: 2,
  [TimelineViewEntryType.ScheduledTask]: 3,
  [TimelineViewEntryType.ScheduledRepeatProjection]: 3,
  [TimelineViewEntryType.CustomEvent]: 3,
  [TimelineViewEntryType.CalendarEvent]: 3,
  [TimelineViewEntryType.RepeatProjection]: 4,
  [TimelineViewEntryType.Task]: 5,
  [TimelineViewEntryType.TaskPlannedForDay]: 7,
  [TimelineViewEntryType.SplitTask]: 7,
  [TimelineViewEntryType.RepeatProjectionSplit]: 8,
  [TimelineViewEntryType.SplitTaskPlannedForDay]: 9,
  [TimelineViewEntryType.RepeatProjectionSplitContinued]: 10,
  [TimelineViewEntryType.SplitTaskContinued]: 11,
  [TimelineViewEntryType.RepeatProjectionSplitContinuedLast]: 12,
  [TimelineViewEntryType.SplitTaskContinuedLast]: 13,
  [TimelineViewEntryType.LunchBreak]: 14,
};

export const SCHEDULE_MOVEABLE_TYPES: TimelineViewEntryType[] = [
  TimelineViewEntryType.TaskPlannedForDay,

  TimelineViewEntryType.Task,
  TimelineViewEntryType.SplitTask,
  TimelineViewEntryType.SplitTaskContinued,
  TimelineViewEntryType.SplitTaskContinuedLast,

  TimelineViewEntryType.RepeatProjection,
  TimelineViewEntryType.RepeatProjectionSplit,
  TimelineViewEntryType.RepeatProjectionSplitContinued,
  TimelineViewEntryType.RepeatProjectionSplitContinuedLast,
];
