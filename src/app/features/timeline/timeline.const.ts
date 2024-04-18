export enum TimelineViewEntryType {
  Task = 'Task',
  ScheduledTask = 'ScheduledTask',
  ScheduledRepeatTaskProjection = 'ScheduledRepeatTaskProjection',
  SplitTask = 'SplitTask',
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
  [TimelineViewEntryType.Task]: 4,
  [TimelineViewEntryType.SplitTask]: 5,
  [TimelineViewEntryType.SplitTaskContinued]: 6,
  [TimelineViewEntryType.SplitTaskContinuedLast]: 7,
  [TimelineViewEntryType.LunchBreak]: 8,
};

export const TIMELINE_MOVEABLE_TYPES: TimelineViewEntryType[] = [
  TimelineViewEntryType.Task,
  TimelineViewEntryType.SplitTask,
  TimelineViewEntryType.SplitTaskContinued,
  TimelineViewEntryType.SplitTaskContinuedLast,
];
