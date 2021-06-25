import { TaskCopy, TaskPlanned } from '../tasks/task.model';
import { TimelineViewEntryType } from './timeline.const';
import { TaskRepeatCfg } from '../task-repeat-cfg/task-repeat-cfg.model';

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

export interface TimelineViewEntryTaskScheduledRepeatProjection
  extends TimelineViewEntryBase {
  type: TimelineViewEntryType.ScheduledRepeatTaskProjection;
  data: TaskRepeatCfg;
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

export interface TimelineDayCrossing extends TimelineViewEntryBase {
  type: TimelineViewEntryType.DayCrossing;
}

export type TimelineViewEntry =
  | TimelineViewEntryTask
  | TimelineViewEntryTaskScheduledRepeatProjection
  | TimelineViewEntrySplitTaskContinued
  | TimelineViewEntryCustomEvent
  | TimelineViewEntryWorkStart
  | TimelineViewEntryWorkEnd
  | TimelineDayCrossing;

// -----------------
// BlockedBlocks
export enum BlockedBlockType {
  ScheduledTask = 'ScheduledTask',
  ScheduledRepeatProjection = 'ScheduledRepeatProjection',
  WorkdayStartEnd = 'WorkdayStartEnd',
}

export interface BlockedBlockEntryScheduledTask {
  start: number;
  end: number;
  type: BlockedBlockType.ScheduledTask;
  data: TaskPlanned;
}

export interface BlockedBlockEntryScheduledRepeatProjection {
  start: number;
  end: number;
  type: BlockedBlockType.ScheduledRepeatProjection;
  data: TaskRepeatCfg;
}

export interface BlockedBlockEntryWorkdayStartEnd {
  start: number;
  end: number;
  type: BlockedBlockType.WorkdayStartEnd;
  data: TimelineWorkStartEndCfg;
}

export type BlockedBlockEntry =
  | BlockedBlockEntryScheduledTask
  | BlockedBlockEntryScheduledRepeatProjection
  | BlockedBlockEntryWorkdayStartEnd;

export interface BlockedBlock {
  start: number;
  end: number;
  entries: BlockedBlockEntry[];
}
