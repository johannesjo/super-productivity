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
export interface TTWorkContextData {
  // TODO maybe shorten prop names, since this is used often
  start: number;
  end: number;
  bNr: number;
  bTime: number;
}

// Map of work session stats by date
export type TTWorkSessionByDateMap = TTDateMap<TTWorkContextData>;

// Work context (project/tag) mapped to their session data by date
export type TTWorkContextSessionMap = TTModelIdMap<TTWorkSessionByDateMap>;

// Main state container
export interface TimeTrackingState {
  project: TTWorkContextSessionMap;
  tag: TTWorkContextSessionMap;
  // somehow can't be optional for ngrx
  lastFlush: number | undefined;
}

// Archive model
export interface ArchiveModel {
  timeTracking: TimeTrackingState;
  task: TaskArchive;
}
