import { TaskWithDueTime } from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import {
  BlockedBlockByDayMap,
  BlockedBlockEntry,
  BlockedBlockType,
  ScheduleCalendarMapEntry,
  ScheduleLunchBreakCfg,
  ScheduleWorkStartEndCfg,
} from '../schedule.model';
import { createSortedBlockerBlocks } from './create-sorted-blocker-blocks';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { getDiffInDays } from '../../../util/get-diff-in-days';

// TODO improve to even better algo for createSortedBlockerBlocks
const NR_OF_DAYS = 10;

// Back-compat overload: old call sites used `now` as 6th argument
/* eslint-disable prefer-arrow/prefer-arrow-functions */
export function createBlockedBlocksByDayMap(
  scheduledTasks: TaskWithDueTime[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  icalEventMap: ScheduleCalendarMapEntry[],
  workStartEndCfg?: ScheduleWorkStartEndCfg,
  weekendWorkStartEndCfg?: ScheduleWorkStartEndCfg,
  now?: number,
  nrOfDays?: number,
): BlockedBlockByDayMap;
export function createBlockedBlocksByDayMap(
  scheduledTasks: TaskWithDueTime[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  icalEventMap: ScheduleCalendarMapEntry[],
  workStartEndEndCfg?: ScheduleWorkStartEndCfg,
  weekendWorkStartEndCfg?: ScheduleWorkStartEndCfg,
  lunchBreakCfg?: ScheduleLunchBreakCfg,
  customBlocksWeekday?: ScheduleWorkStartEndCfg[],
  customBlocksWeekend?: ScheduleWorkStartEndCfg[],
  now?: number,
  nrOfDays?: number,
): BlockedBlockByDayMap;
export function createBlockedBlocksByDayMap(
  scheduledTasks: TaskWithDueTime[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  icalEventMap: ScheduleCalendarMapEntry[],
  workStartEndCfg?: ScheduleWorkStartEndCfg,
  weekendWorkStartEndCfg?: ScheduleWorkStartEndCfg,
  a6?: any,
  a7?: any,
  a8?: any,
  a9?: any,
  a10?: any,
): BlockedBlockByDayMap {
  // Normalize args for both signatures
  let lunchBreakCfg: ScheduleLunchBreakCfg | undefined;
  let customBlocksWeekday: ScheduleWorkStartEndCfg[] | undefined;
  let customBlocksWeekend: ScheduleWorkStartEndCfg[] | undefined;
  let now: number | undefined;
  let nrOfDays: number = NR_OF_DAYS;

  if (typeof a6 === 'number') {
    // Old signature: a6=now, a7=nrOfDays
    now = a6 as number;
    nrOfDays = typeof a7 === 'number' ? (a7 as number) : NR_OF_DAYS;
  } else {
    lunchBreakCfg = a6 as ScheduleLunchBreakCfg | undefined;
    customBlocksWeekday = a7 as ScheduleWorkStartEndCfg[] | undefined;
    customBlocksWeekend = a8 as ScheduleWorkStartEndCfg[] | undefined;
    now = a9 as number | undefined;
    nrOfDays = typeof a10 === 'number' ? (a10 as number) : NR_OF_DAYS;
  }
  const allBlockedBlocks = createSortedBlockerBlocks(
    scheduledTasks,
    scheduledTaskRepeatCfgs,
    icalEventMap,
    workStartEndCfg,
    weekendWorkStartEndCfg,
    lunchBreakCfg,
    customBlocksWeekday,
    customBlocksWeekend,
    now,
    nrOfDays,
  );
  // Log.log(allBlockedBlocks);

  const blockedBlocksByDay: BlockedBlockByDayMap = {};

  allBlockedBlocks.forEach((block) => {
    const dayStartDateStr = getDbDateStr(block.start);
    const startDayEndBoundaryTs = new Date(block.start).setHours(24, 0, 0, 0);

    if (!blockedBlocksByDay[dayStartDateStr]) {
      blockedBlocksByDay[dayStartDateStr] = [];
    }
    const nrOfExtraDaysToSpawn = getDiffInDays(
      new Date(block.start),
      new Date(block.end),
    );

    const splitEntriesBlockStart = createEntriesForDay(
      block.entries,
      startDayEndBoundaryTs,
    );

    // cut off block to fit into dayEND boundary
    blockedBlocksByDay[dayStartDateStr].push({
      ...block,
      end: Math.min(startDayEndBoundaryTs, block.end),
      entries: splitEntriesBlockStart.entriesBeforeEnd,
    });

    // spawn an extra day if needed
    if (nrOfExtraDaysToSpawn > 0) {
      let entriesForNextDay: BlockedBlockEntry[] = splitEntriesBlockStart.entriesAfterEnd;
      for (let i = 0; i < nrOfExtraDaysToSpawn; i++) {
        const curDateTs = new Date(block.start).setDate(
          new Date(block.start).getDate() + i + 1,
        );
        const dayStr = getDbDateStr(curDateTs);
        const dayStartBoundaryTs = new Date(curDateTs).setHours(0, 0, 0, 0);
        const dayEndBoundaryTs = new Date(curDateTs).setHours(24, 0, 0, 0);

        if (!blockedBlocksByDay[dayStr]) {
          blockedBlocksByDay[dayStr] = [];
        }
        const { entriesBeforeEnd, entriesAfterEnd } = createEntriesForDay(
          entriesForNextDay,
          dayEndBoundaryTs,
        );
        entriesForNextDay = entriesAfterEnd;
        blockedBlocksByDay[dayStr].push({
          ...block,
          entries: entriesBeforeEnd,
          start: dayStartBoundaryTs,
          end: Math.min(dayEndBoundaryTs, block.end),
        });
      }
    }
  });

  return blockedBlocksByDay;
}
/* eslint-enable prefer-arrow/prefer-arrow-functions */
const createEntriesForDay = (
  entries: BlockedBlockEntry[],
  dayEnd: number,
): {
  entriesBeforeEnd: BlockedBlockEntry[];
  entriesAfterEnd: BlockedBlockEntry[];
} => {
  const entriesBeforeEnd: BlockedBlockEntry[] = [];
  const entriesAfterEnd: BlockedBlockEntry[] = [];

  entries.forEach((entry) => {
    if (entry.start < dayEnd && entry.end > dayEnd) {
      if (entry.type === 'WorkdayStartEnd') {
        entriesBeforeEnd.push(entry);
        entriesAfterEnd.push(entry);
      } else if (entry.type === 'LunchBreak') {
        throw new Error('Lunch breaks should never span into next day');
      } else {
        const { before, after } = splitEntry(entry, dayEnd);
        entriesBeforeEnd.push(before);
        entriesAfterEnd.push(after);
      }
    } else if (entry.start < dayEnd) {
      entriesBeforeEnd.push(entry);
    } else {
      entriesAfterEnd.push(entry);
    }
  });

  return { entriesBeforeEnd, entriesAfterEnd };
};

// TODO maybe create a split scheduled type
const splitEntry = (
  entry: BlockedBlockEntry,
  splitAt: number,
): { before: BlockedBlockEntry; after: BlockedBlockEntry } => {
  const afterType = (() => {
    switch (entry.type) {
      case BlockedBlockType.WorkdayStartEnd:
        return BlockedBlockType.WorkdayStartEnd;
      case BlockedBlockType.ScheduledTask:
      case BlockedBlockType.ScheduledTaskSplit:
        return BlockedBlockType.ScheduledTaskSplit;
      case BlockedBlockType.ScheduledRepeatProjection:
      case BlockedBlockType.ScheduledRepeatProjectionSplit:
        return BlockedBlockType.ScheduledRepeatProjectionSplit;
      case BlockedBlockType.CalendarEvent:
        return BlockedBlockType.CalendarEvent;
      default: {
        throw new Error('Unknown entry type');
      }
    }
  })();
  return {
    before: {
      ...entry,
      end: splitAt,
    },
    after: {
      ...entry,
      start: splitAt,
      type: afterType,
    } as BlockedBlockEntry,
  };
};
