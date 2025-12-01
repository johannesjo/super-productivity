export enum SVEType {
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
  [SVEType.WorkdayStart]: 1,
  [SVEType.WorkdayEnd]: 2,
  [SVEType.ScheduledTask]: 3,
  [SVEType.ScheduledRepeatProjection]: 3,
  [SVEType.CalendarEvent]: 3,
  [SVEType.RepeatProjection]: 4,
  [SVEType.Task]: 5,
  [SVEType.TaskPlannedForDay]: 7,
  [SVEType.SplitTask]: 7,
  [SVEType.RepeatProjectionSplit]: 8,
  [SVEType.SplitTaskPlannedForDay]: 9,
  [SVEType.RepeatProjectionSplitContinued]: 10,
  [SVEType.SplitTaskContinued]: 11,
  [SVEType.RepeatProjectionSplitContinuedLast]: 12,
  [SVEType.SplitTaskContinuedLast]: 13,
  [SVEType.LunchBreak]: 14,
};

export const SCHEDULE_FLOW_TYPES: SVEType[] = [
  SVEType.TaskPlannedForDay,

  SVEType.Task,
  SVEType.SplitTask,
  SVEType.SplitTaskContinued,
  SVEType.SplitTaskContinuedLast,

  SVEType.RepeatProjection,
  SVEType.RepeatProjectionSplit,
  SVEType.RepeatProjectionSplitContinued,
  SVEType.RepeatProjectionSplitContinuedLast,
];

// eslint-disable-next-line no-mixed-operators
export const SCHEDULE_TASK_MIN_DURATION_IN_MS = 10 * 60 * 1000 + 1;

export const FH = 12;

export const T_ID_PREFIX = 't-' as const;
