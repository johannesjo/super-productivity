import { TaskCopy, TaskWithReminder } from '../tasks/task.model';
import { TimelineViewEntryType } from './timeline.const';

interface TimelineViewEntryBase {
  id: string;
  type: TimelineViewEntryType;
  start: number;
  isHideTime: boolean;
}

export interface TimelineViewEntryTask extends TimelineViewEntryBase {
  type:
    | TimelineViewEntryType.Task
    | TimelineViewEntryType.ScheduledTask
    | TimelineViewEntryType.SplitTask;
  data: TaskCopy;
}

export interface TimelineViewEntrySplitTaskContinued extends TimelineViewEntryBase {
  type:
    | TimelineViewEntryType.SplitTaskContinued
    | TimelineViewEntryType.SplitTaskContinuedLast;
  data: {
    title: string;
    timeToGo: number;
    taskId: string;
    index: number;
  };
}

export interface TimelineCustomEvent {
  title: string;
  start: number;
  duration: number;
  icon: string;
}

interface TimelineViewEntryCustomEvent extends TimelineViewEntryBase {
  type: TimelineViewEntryType.CustomEvent;
  data: TimelineCustomEvent;
}

export interface TimelineWorkStartEndCfg {
  startTime: string;
  endTime: string;
}

interface TimelineViewEntryWorkStart extends TimelineViewEntryBase {
  type: TimelineViewEntryType.WorkdayStart;
  data: TimelineWorkStartEndCfg;
}

interface TimelineViewEntryWorkEnd extends TimelineViewEntryBase {
  type: TimelineViewEntryType.WorkdayEnd;
  data: TimelineWorkStartEndCfg;
}

export type TimelineViewEntry =
  | TimelineViewEntryTask
  | TimelineViewEntrySplitTaskContinued
  | TimelineViewEntryCustomEvent
  | TimelineViewEntryWorkStart
  | TimelineViewEntryWorkEnd;

// -----------------
// BlockedBlocks
export enum BlockedBlockType {
  ScheduledTask = 'ScheduledTask',
  WorkdayStartEnd = 'WorkdayStartEnd',
}

export interface BlockedBlockEntryScheduledTask {
  start: number;
  end: number;
  type: BlockedBlockType.ScheduledTask;
  data: TaskWithReminder;
}

export interface BlockedBlockEntryWorkdayStartEnd {
  start: number;
  end: number;
  type: BlockedBlockType.WorkdayStartEnd;
  data: TimelineWorkStartEndCfg;
}

export type BlockedBlockEntry =
  | BlockedBlockEntryScheduledTask
  | BlockedBlockEntryWorkdayStartEnd;

export interface BlockedBlock {
  start: number;
  end: number;
  entries: BlockedBlockEntry[];
}
