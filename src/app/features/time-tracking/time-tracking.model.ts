// TODO compare with NEW-tracking.model.ts

import { TaskArchive } from '../tasks/task.model';

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

export interface TimeTrackingState {
  project: TimeTrackingMapByEntryId<TimeTrackingForDay<TimeTrackingWorkStartEnd>>;
  tag: TimeTrackingMapByEntryId<TimeTrackingForDay<TimeTrackingWorkStartEnd>>;
  task: TimeTrackingMapByEntryId<TimeTrackingForDay<number>>;
  break: TimeTrackingMapByEntryId<TimeTrackingForDay<TimeTrackingBreakCount>>;
  lastFlush: number;
}

export interface ArchiveModel {
  timeTracking: TimeTrackingState;
  task: TaskArchive;
}
