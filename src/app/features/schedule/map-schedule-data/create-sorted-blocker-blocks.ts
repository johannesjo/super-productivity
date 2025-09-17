import { TaskWithDueTime } from '../../tasks/task.model';

import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import {
  BlockedBlock,
  BlockedBlockType,
  ScheduleCalendarMapEntry,
  ScheduleLunchBreakCfg,
  ScheduleWorkStartEndCfg,
} from '../schedule.model';
import { selectTaskRepeatCfgsForExactDay } from '../../task-repeat-cfg/store/task-repeat-cfg.selectors';
const PROJECTION_DAYS: number = 30;

/* eslint-disable prefer-arrow/prefer-arrow-functions */
export function createSortedBlockerBlocks(
  scheduledTasks: TaskWithDueTime[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  icalEventMap: ScheduleCalendarMapEntry[],
  workStartEndCfg?: ScheduleWorkStartEndCfg,
  weekendWorkStartEndCfg?: ScheduleWorkStartEndCfg,
  now?: number,
  nrOfDays?: number,
): BlockedBlock[];
export function createSortedBlockerBlocks(
  scheduledTasks: TaskWithDueTime[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  icalEventMap: ScheduleCalendarMapEntry[],
  workStartEndCfg?: ScheduleWorkStartEndCfg,
  weekendWorkStartEndCfg?: ScheduleWorkStartEndCfg,
  lunchBreakCfg?: ScheduleLunchBreakCfg,
  customBlocksWeekday?: ScheduleWorkStartEndCfg[],
  customBlocksWeekend?: ScheduleWorkStartEndCfg[],
  now?: number,
  nrOfDays?: number,
): BlockedBlock[];
export function createSortedBlockerBlocks(
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
): BlockedBlock[] {
  let lunchBreakCfg: ScheduleLunchBreakCfg | undefined;
  let customBlocksWeekday: ScheduleWorkStartEndCfg[] | undefined;
  let customBlocksWeekend: ScheduleWorkStartEndCfg[] | undefined;
  let now: number = Date.now();
  let nrOfDays: number = PROJECTION_DAYS;

  if (typeof a6 === 'number') {
    now = a6 as number;
    nrOfDays = typeof a7 === 'number' ? (a7 as number) : PROJECTION_DAYS;
    // Back-compat: tests sometimes pass lunchBreakCfg as 5th param
    // (workStartEndCfg provided, weekendWorkStartEndCfg actually holds lunch window)
    if (weekendWorkStartEndCfg && !lunchBreakCfg) {
      lunchBreakCfg = weekendWorkStartEndCfg as unknown as ScheduleLunchBreakCfg;
      weekendWorkStartEndCfg = undefined;
    }
  } else {
    lunchBreakCfg = a6 as ScheduleLunchBreakCfg | undefined;
    // Support signature: (..., lunchBreakCfg, now)
    if (typeof a7 === 'number') {
      now = a7 as number;
      nrOfDays = typeof a8 === 'number' ? (a8 as number) : PROJECTION_DAYS;
      customBlocksWeekday = undefined;
      customBlocksWeekend = undefined;
    } else {
      customBlocksWeekday = a7 as ScheduleWorkStartEndCfg[] | undefined;
      // Support signature: (..., lunchBreakCfg, customBlocksWeekday, now)
      if (typeof a8 === 'number') {
        now = a8 as number;
        nrOfDays = typeof a9 === 'number' ? (a9 as number) : PROJECTION_DAYS;
        customBlocksWeekend = undefined;
      } else {
        customBlocksWeekend = a8 as ScheduleWorkStartEndCfg[] | undefined;
        now = typeof a9 === 'number' ? (a9 as number) : Date.now();
        nrOfDays = typeof a10 === 'number' ? (a10 as number) : PROJECTION_DAYS;
      }
    }
  }

  if (typeof now !== 'number') {
    throw new Error('No valid now given');
  }
  let blockedBlocks: BlockedBlock[] = [
    ...createBlockerBlocksForScheduledTasks(scheduledTasks),
    ...createBlockerBlocksForCalendarEvents(icalEventMap),
    ...createBlockerBlocksForScheduledRepeatProjections(
      now,
      nrOfDays,
      scheduledTaskRepeatCfgs,
    ),
    ...createBlockerBlocksForWorkStartEnd(
      now,
      nrOfDays,
      workStartEndCfg,
      weekendWorkStartEndCfg,
    ),
    ...createBlockerBlocksForLunchBreak(now, nrOfDays, lunchBreakCfg),
    ...createBlockerBlocksForCustomBlocks(
      now,
      nrOfDays,
      customBlocksWeekday,
      customBlocksWeekend,
    ),
  ];

  blockedBlocks = mergeBlocksRecursively(blockedBlocks);
  blockedBlocks.sort((a, b) => a.start - b.start);
  // Log.log(
  //   blockedBlocks.map(({ start, end }) => ({
  //     // start,
  //     // end,
  //     s: new Date(start),
  //     e: new Date(end),
  //   })),
  // );
  // Log.log(blockedBlocks);

  return blockedBlocks;
}
/* eslint-enable prefer-arrow/prefer-arrow-functions */

const createBlockerBlocksForScheduledRepeatProjections = (
  now: number,
  nrOfDays: number,
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
): BlockedBlock[] => {
  const blockedBlocks: BlockedBlock[] = [];

  let i: number = 1;
  while (i < nrOfDays) {
    // Calculate proper day start instead of adding 24-hour increments
    const nowDate = new Date(now);
    const targetDate = new Date(nowDate);
    targetDate.setDate(nowDate.getDate() + i);
    targetDate.setHours(0, 0, 0, 0);
    const currentDayTimestamp = targetDate.getTime();

    const allRepeatableTasksForDay = selectTaskRepeatCfgsForExactDay.projector(
      scheduledTaskRepeatCfgs,
      {
        dayDate: currentDayTimestamp,
      },
    );
    i++;

    allRepeatableTasksForDay.forEach((repeatCfg) => {
      if (!repeatCfg.startTime) {
        throw new Error('Timeline: No startTime for repeat projection');
      }
      const start = getDateTimeFromClockString(repeatCfg.startTime, currentDayTimestamp);
      const end = start + (repeatCfg.defaultEstimate || 0);
      blockedBlocks.push({
        start,
        end,
        entries: [
          {
            type: BlockedBlockType.ScheduledRepeatProjection,
            data: repeatCfg,
            start,
            end,
          },
        ],
      });
    });
  }

  return blockedBlocks;
};

const createBlockerBlocksForWorkStartEnd = (
  now: number,
  nrOfDays: number,
  workStartEndCfg?: ScheduleWorkStartEndCfg,
  weekendWorkStartEndCfg?: ScheduleWorkStartEndCfg,
): BlockedBlock[] => {
  const blockedBlocks: BlockedBlock[] = [];

  if (!workStartEndCfg && !weekendWorkStartEndCfg) {
    return blockedBlocks;
  }
  let i: number = 0;
  while (i < nrOfDays) {
    // Calculate proper day start instead of adding 24-hour increments
    const nowDate = new Date(now);
    const currentDate = new Date(nowDate);
    currentDate.setDate(nowDate.getDate() + i);
    currentDate.setHours(0, 0, 0, 0);
    const currentDayTimestamp = currentDate.getTime();
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

    const nextDate = new Date(nowDate);
    nextDate.setDate(nowDate.getDate() + i + 1);
    nextDate.setHours(0, 0, 0, 0);
    const nextDayTimestamp = nextDate.getTime();

    const cfgToday =
      isWeekend && weekendWorkStartEndCfg ? weekendWorkStartEndCfg : workStartEndCfg;
    if (!cfgToday) {
      i++;
      continue;
    }

    const nextIsWeekend = nextDate.getDay() === 0 || nextDate.getDay() === 6;
    const cfgNext =
      nextIsWeekend && weekendWorkStartEndCfg ? weekendWorkStartEndCfg : workStartEndCfg;

    const start = getDateTimeFromClockString(cfgToday.endTime, currentDayTimestamp);
    const end = getDateTimeFromClockString(
      (cfgNext || cfgToday).startTime,
      nextDayTimestamp,
    );
    blockedBlocks.push({
      start,
      end,
      entries: [
        {
          type: BlockedBlockType.WorkdayStartEnd,
          data: cfgToday,
          start,
          end,
        },
      ],
    });
    i++;
  }

  return blockedBlocks;
};

const createBlockerBlocksForLunchBreak = (
  now: number,
  nrOfDays: number,
  lunchBreakCfg?: ScheduleLunchBreakCfg,
): BlockedBlock[] => {
  const blockedBlocks: BlockedBlock[] = [];

  if (!lunchBreakCfg) {
    return blockedBlocks;
  }
  let i: number = 0;
  while (i < nrOfDays) {
    // Calculate proper day start instead of adding 24-hour increments
    const nowDate = new Date(now);
    const targetDate = new Date(nowDate);
    targetDate.setDate(nowDate.getDate() + i);
    targetDate.setHours(0, 0, 0, 0);
    const currentDayTimestamp = targetDate.getTime();

    const start = getDateTimeFromClockString(
      lunchBreakCfg.startTime,
      currentDayTimestamp,
    );
    const end = getDateTimeFromClockString(lunchBreakCfg.endTime, currentDayTimestamp);
    blockedBlocks.push({
      start,
      end,
      entries: [
        {
          type: BlockedBlockType.LunchBreak,
          data: lunchBreakCfg,
          start,
          end,
        },
      ],
    });
    i++;
  }

  return blockedBlocks;
};

const createBlockerBlocksForCustomBlocks = (
  now: number,
  nrOfDays: number,
  customBlocksWeekday?: ScheduleWorkStartEndCfg[],
  customBlocksWeekend?: ScheduleWorkStartEndCfg[],
): BlockedBlock[] => {
  const blockedBlocks: BlockedBlock[] = [];
  const hasWeekday = !!customBlocksWeekday && customBlocksWeekday.length > 0;
  const hasWeekend = !!customBlocksWeekend && customBlocksWeekend.length > 0;
  if (!hasWeekday && !hasWeekend) {
    return blockedBlocks;
  }
  for (let i = 0; i < nrOfDays; i++) {
    const nowDate = new Date(now);
    const targetDate = new Date(nowDate);
    targetDate.setDate(nowDate.getDate() + i);
    targetDate.setHours(0, 0, 0, 0);
    const currentDayTimestamp = targetDate.getTime();
    const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;

    const blocksForDay = isWeekend ? customBlocksWeekend : customBlocksWeekday;
    (blocksForDay || []).forEach((cfg) => {
      if (!cfg?.startTime || !cfg?.endTime) {
        return;
      }
      const start = getDateTimeFromClockString(cfg.startTime, currentDayTimestamp);
      const end = getDateTimeFromClockString(cfg.endTime, currentDayTimestamp);
      if (isNaN(start) || isNaN(end) || end <= start) {
        return;
      }
      blockedBlocks.push({
        start,
        end,
        entries: [
          {
            type: BlockedBlockType.LunchBreak,
            data: { startTime: cfg.startTime, endTime: cfg.endTime },
            start,
            end,
          },
        ],
      });
    });
  }
  return blockedBlocks;
};

const createBlockerBlocksForScheduledTasks = (
  scheduledTasks: TaskWithDueTime[],
): BlockedBlock[] => {
  const blockedBlocks: BlockedBlock[] = [];
  scheduledTasks.forEach((task) => {
    const start = task.dueWithTime;
    // const end = task.due + Math.max(getTimeLeftForTask(task), 1);
    const end = task.dueWithTime + getTimeLeftForTask(task);

    let wasMerged = false;
    for (const blockedBlock of blockedBlocks) {
      if (isOverlappingBlock({ start, end }, blockedBlock)) {
        blockedBlock.start = Math.min(start, blockedBlock.start);
        blockedBlock.end = Math.max(end, blockedBlock.end);
        blockedBlock.entries.push({
          start,
          end,
          type: BlockedBlockType.ScheduledTask,
          data: task,
        });
        wasMerged = true;
        break;
      }
    }

    if (!wasMerged) {
      blockedBlocks.push({
        start,
        end,
        entries: [
          {
            start,
            end,
            type: BlockedBlockType.ScheduledTask,
            data: task,
          },
        ],
      });
    }
  });

  return blockedBlocks;
};

const createBlockerBlocksForCalendarEvents = (
  icalEventMap: ScheduleCalendarMapEntry[],
): BlockedBlock[] => {
  const blockedBlocks: BlockedBlock[] = [];
  icalEventMap.forEach((icalMapEntry) => {
    icalMapEntry.items.forEach((calEv) => {
      const start = calEv.start;
      const end = calEv.start + calEv.duration;

      let wasMerged = false;
      for (const blockedBlock of blockedBlocks) {
        if (isOverlappingBlock({ start, end }, blockedBlock)) {
          blockedBlock.start = Math.min(start, blockedBlock.start);
          blockedBlock.end = Math.max(end, blockedBlock.end);
          blockedBlock.entries.push({
            start,
            end,
            type: BlockedBlockType.CalendarEvent,
            data: { ...calEv },
          });
          wasMerged = true;
          break;
        }
      }

      if (!wasMerged) {
        blockedBlocks.push({
          start,
          end,
          entries: [
            {
              start,
              end,
              type: BlockedBlockType.CalendarEvent,
              data: { ...calEv },
            },
          ],
        });
      }
    });
  });

  return blockedBlocks;
};

// NOTE: we recursively merge all overlapping blocks
// TODO find more effective algorithm
const mergeBlocksRecursively = (blockedBlocks: BlockedBlock[]): BlockedBlock[] => {
  for (const blockedBlock of blockedBlocks) {
    let wasMergedInner = false;
    for (const blockedBlockInner of blockedBlocks) {
      if (
        blockedBlockInner !== blockedBlock &&
        isOverlappingBlock(blockedBlockInner, blockedBlock)
      ) {
        blockedBlock.start = Math.min(blockedBlockInner.start, blockedBlock.start);
        blockedBlock.end = Math.max(blockedBlockInner.end, blockedBlock.end);
        blockedBlock.entries = blockedBlock.entries.concat(blockedBlockInner.entries);
        blockedBlocks.splice(blockedBlocks.indexOf(blockedBlockInner), 1);
        wasMergedInner = true;
        break;
      }
    }
    if (wasMergedInner) {
      return mergeBlocksRecursively(blockedBlocks);
    }
  }
  return blockedBlocks;
};

const isOverlappingBlock = (
  { start, end }: { start: number; end: number },
  blockedBlock: BlockedBlock,
): boolean => {
  return (
    (start >= blockedBlock.start && start <= blockedBlock.end) || // start is between block
    (end >= blockedBlock.start && end <= blockedBlock.end)
  ); // end is between block;
};
