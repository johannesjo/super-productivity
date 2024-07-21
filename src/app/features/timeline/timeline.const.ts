export enum TimelineViewEntryType {
  Task = 'Task',
  TaskPlannedForDay = 'TaskPlannedForDay',
  ScheduledTask = 'ScheduledTask',
  NonScheduledRepeatTaskProjection = 'NonScheduledRepeatTaskProjection',
  ScheduledRepeatTaskProjection = 'ScheduledRepeatTaskProjection',
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

export const TIMELINE_VIEW_TYPE_ORDER: {
  [key: string]: number;
} = {
  [TimelineViewEntryType.WorkdayStart]: 1,
  [TimelineViewEntryType.WorkdayEnd]: 2,
  [TimelineViewEntryType.ScheduledTask]: 3,
  [TimelineViewEntryType.ScheduledRepeatTaskProjection]: 3,
  [TimelineViewEntryType.CustomEvent]: 3,
  [TimelineViewEntryType.CalendarEvent]: 3,
  [TimelineViewEntryType.NonScheduledRepeatTaskProjection]: 4,
  [TimelineViewEntryType.Task]: 5,
  [TimelineViewEntryType.TaskPlannedForDay]: 7,
  [TimelineViewEntryType.SplitTask]: 7,
  [TimelineViewEntryType.SplitTaskPlannedForDay]: 8,
  [TimelineViewEntryType.SplitTaskContinued]: 9,
  [TimelineViewEntryType.SplitTaskContinuedLast]: 10,
  [TimelineViewEntryType.LunchBreak]: 11,
};

export const TIMELINE_MOVEABLE_TYPES: TimelineViewEntryType[] = [
  TimelineViewEntryType.Task,
  TimelineViewEntryType.SplitTask,
  TimelineViewEntryType.SplitTaskContinued,
  TimelineViewEntryType.SplitTaskContinuedLast,
  // TODO check if this is correct
  TimelineViewEntryType.TaskPlannedForDay,
];
