import { TaskPlanned } from '../../tasks/task.model';
import {
  BlockedBlock,
  BlockedBlockType,
  TimelineWorkStartEndCfg,
} from '../timeline.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import {
  TASK_REPEAT_WEEKDAY_MAP,
  TaskRepeatCfg,
} from '../../task-repeat-cfg/task-repeat-cfg.model';

const PROJECTION_DAYS: number = 29;

export const createSortedBlockerBlocks = (
  scheduledTasks: TaskPlanned[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  workStartEndCfg?: TimelineWorkStartEndCfg,
  now?: number,
): BlockedBlock[] => {
  if (typeof now !== 'number') {
    throw new Error('No valid now given');
  }
  let blockedBlocks: BlockedBlock[] = [
    ...createBlockerBlocksForScheduledTasks(scheduledTasks),
    ...createBlockerBlocksForScheduledRepeatProjections(
      now as number,
      scheduledTaskRepeatCfgs,
    ),
    ...createBlockerBlocksForWorkStartEnd(now as number, workStartEndCfg),
  ];

  blockedBlocks = mergeBlocksRecursively(blockedBlocks);
  blockedBlocks.sort((a, b) => a.start - b.start);
  // console.log(
  //   blockedBlocks.map(({ start, end }) => ({
  //     // start,
  //     // end,
  //     s: new Date(start),
  //     e: new Date(end),
  //   })),
  // );
  return blockedBlocks;
};

const createBlockerBlocksForScheduledRepeatProjections = (
  now: number,
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
): BlockedBlock[] => {
  const blockedBlocks: BlockedBlock[] = [];

  scheduledTaskRepeatCfgs.forEach((repeatCfg) => {
    // NOTE: we start at 1 as we assume there already is a task for today
    let i: number = 1;
    while (i <= PROJECTION_DAYS) {
      if (!repeatCfg.startTime) {
        throw new Error('Timeline: No startTime for repeat projection');
      }
      const start = getDateTimeFromClockString(
        repeatCfg.startTime,
        // prettier-ignore
        now + (i * 24 * 60 * 60 * 1000),
      );
      const day = new Date(start).getDay();
      const dayStr: keyof TaskRepeatCfg = TASK_REPEAT_WEEKDAY_MAP[day];
      const isRepeatForDay: boolean = !!repeatCfg[dayStr];

      if (isRepeatForDay && start > repeatCfg.lastTaskCreation) {
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
      }
      i++;
    }
  });

  return blockedBlocks;
};

const createBlockerBlocksForWorkStartEnd = (
  now: number,
  workStartEndCfg?: TimelineWorkStartEndCfg,
): BlockedBlock[] => {
  const blockedBlocks: BlockedBlock[] = [];

  if (!workStartEndCfg) {
    return blockedBlocks;
  }
  let i: number = 0;
  while (i <= PROJECTION_DAYS) {
    const start = getDateTimeFromClockString(
      workStartEndCfg.endTime,
      // prettier-ignore
      now + (i * 24 * 60 * 60 * 1000),
    );
    const end = getDateTimeFromClockString(
      workStartEndCfg.startTime,
      // prettier-ignore
      now + ((i + 1) * 24 * 60 * 60 * 1000),
    );
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

const createBlockerBlocksForScheduledTasks = (
  scheduledTasks: TaskPlanned[],
): BlockedBlock[] => {
  const blockedBlocks: BlockedBlock[] = [];
  scheduledTasks.forEach((task) => {
    const start = task.plannedAt;
    // const end = task.plannedAt + Math.max(getTimeLeftForTask(task), 1);
    const end = task.plannedAt + getTimeLeftForTask(task);

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
