export enum ScheduleViewEntryType {
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
  CalendarEvent = 'CalendarEvent',
  WorkdayStart = 'WorkdayStart',
  WorkdayEnd = 'WorkdayEnd',
  LunchBreak = 'LunchBreak',
}

export const SCHEDULE_VIEW_TYPE_ORDER: {
  [key: string]: number;
} = {
  [ScheduleViewEntryType.WorkdayStart]: 1,
  [ScheduleViewEntryType.WorkdayEnd]: 2,
  [ScheduleViewEntryType.ScheduledTask]: 3,
  [ScheduleViewEntryType.ScheduledRepeatProjection]: 3,
  [ScheduleViewEntryType.CalendarEvent]: 3,
  [ScheduleViewEntryType.RepeatProjection]: 4,
  [ScheduleViewEntryType.Task]: 5,
  [ScheduleViewEntryType.TaskPlannedForDay]: 7,
  [ScheduleViewEntryType.SplitTask]: 7,
  [ScheduleViewEntryType.RepeatProjectionSplit]: 8,
  [ScheduleViewEntryType.SplitTaskPlannedForDay]: 9,
  [ScheduleViewEntryType.RepeatProjectionSplitContinued]: 10,
  [ScheduleViewEntryType.SplitTaskContinued]: 11,
  [ScheduleViewEntryType.RepeatProjectionSplitContinuedLast]: 12,
  [ScheduleViewEntryType.SplitTaskContinuedLast]: 13,
  [ScheduleViewEntryType.LunchBreak]: 14,
};

export const SCHEDULE_MOVEABLE_TYPES: ScheduleViewEntryType[] = [
  ScheduleViewEntryType.TaskPlannedForDay,

  ScheduleViewEntryType.Task,
  ScheduleViewEntryType.SplitTask,
  ScheduleViewEntryType.SplitTaskContinued,
  ScheduleViewEntryType.SplitTaskContinuedLast,

  ScheduleViewEntryType.RepeatProjection,
  ScheduleViewEntryType.RepeatProjectionSplit,
  ScheduleViewEntryType.RepeatProjectionSplitContinued,
  ScheduleViewEntryType.RepeatProjectionSplitContinuedLast,
];

export const SCHEDULE_TASK_MIN_DURATION_IN_MS = 5 * 60 * 1000;
