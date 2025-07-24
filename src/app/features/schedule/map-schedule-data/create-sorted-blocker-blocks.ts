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

export const createSortedBlockerBlocks = (
  scheduledTasks: TaskWithDueTime[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  icalEventMap: ScheduleCalendarMapEntry[],
  workStartEndCfg?: ScheduleWorkStartEndCfg,
  lunchBreakCfg?: ScheduleLunchBreakCfg,
  now: number = Date.now(),
  nrOfDays: number = PROJECTION_DAYS,
): BlockedBlock[] => {
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
    ...createBlockerBlocksForWorkStartEnd(now, nrOfDays, workStartEndCfg),
    ...createBlockerBlocksForLunchBreak(now, nrOfDays, lunchBreakCfg),
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
};

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
): BlockedBlock[] => {
  const blockedBlocks: BlockedBlock[] = [];

  if (!workStartEndCfg) {
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

    const nextDate = new Date(nowDate);
    nextDate.setDate(nowDate.getDate() + i + 1);
    nextDate.setHours(0, 0, 0, 0);
    const nextDayTimestamp = nextDate.getTime();

    const start = getDateTimeFromClockString(
      workStartEndCfg.endTime,
      currentDayTimestamp,
    );
    const end = getDateTimeFromClockString(workStartEndCfg.startTime, nextDayTimestamp);
    blockedBlocks.push({
      start,
      end,
      entries: [
        {
          type: BlockedBlockType.WorkdayStartEnd,
          data: workStartEndCfg,
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
