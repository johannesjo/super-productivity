// TODO compare with NEW-tracking.model.ts

export interface TimeTrackingMapByEntryId<T> {
  [modelEntryId: string]: T;
}

export interface TimeTrackingForDay<T> {
  [date: string]: T;
}

export interface TimeTrackingWorkStartEnd {
  start: number;
  end: number;
}

export interface TimeTrackingBreakCount {
  nr: number;
  time: number;
}

export interface TimeTracking {
  project: TimeTrackingMapByEntryId<TimeTrackingForDay<TimeTrackingWorkStartEnd>>;
  tag: TimeTrackingMapByEntryId<TimeTrackingForDay<TimeTrackingWorkStartEnd>>;
  task: TimeTrackingMapByEntryId<TimeTrackingForDay<number>>;
  break: TimeTrackingMapByEntryId<TimeTrackingForDay<TimeTrackingBreakCount>>;
  lastFlush: number;
}

export interface TimeTrackingArchive extends TimeTracking {
  newestEntry: number;
}
