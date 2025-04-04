// Base mapped types with clearer names
import { TaskArchive } from '../tasks/task.model';

export type TTModelIdMap<T> = Omit<
  Record<string, T>,
  keyof TTWorkContextData | keyof TimeTrackingState | 'workStart' | 'workEnd'
>;
export type TTDateMap<T> = Omit<
  Record<string, T>,
  keyof TTWorkContextData | keyof TimeTrackingState | 'workStart' | 'workEnd'
>;

// Core time tracking entities
// NOTE: shortened to 1 letter to save disk space
// TODO all members should be optional
export interface TTWorkContextData {
  // start
  s?: number;
  // end
  e?: number;
  // breakNr
  b?: number;
  // breakTime
  bt?: number;
}

/*
project:
  [projectId]:
    [date]:
      s: number;
      ...

project: -> TTWorkContextSessionMap
  [projectId]: -> TTWorkSessionByDateMap
    [date]: -> TTWorkContextData
      s: number;
      ...
 */

// Map of work session stats by date
export type TTWorkSessionByDateMap = TTDateMap<TTWorkContextData>;

// Work context (project/tag) mapped to their session data by date
export type TTWorkContextSessionMap = TTModelIdMap<TTWorkSessionByDateMap>;

// Main state container
export interface TimeTrackingState {
  project: TTWorkContextSessionMap;
  tag: TTWorkContextSessionMap;
  // somehow can't be optional for ngrx
}

// Archive model
export interface ArchiveModel {
  // should not be written apart from flushing!
  timeTracking: TimeTrackingState;
  // TODO rename to taskArchive or similar
  task: TaskArchive;
  // TODO rename to lastFlushTimeTracking
  lastTimeTrackingFlush: number;
}
