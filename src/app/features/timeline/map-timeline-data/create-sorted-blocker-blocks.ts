import { TaskWithReminder } from '../../tasks/task.model';
import {
  BlockedBlock,
  BlockedBlockType,
  TimelineWorkStartEndCfg,
} from '../timeline.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';

export const createSortedBlockerBlocks = (
  scheduledTasks: TaskWithReminder[],
  workStartEndCfg?: TimelineWorkStartEndCfg,
  now?: number,
): BlockedBlock[] => {
  let blockedBlocks: BlockedBlock[] = [
    ...createBlockerBlocksForScheduledTasks(scheduledTasks),
    ...createBlockerBlocksForWorkStartEnd(now as number, workStartEndCfg),
  ];

  blockedBlocks = mergeBlocksRecursively(blockedBlocks);
  blockedBlocks.sort((a, b) => a.start - b.start);
  return blockedBlocks;
};

const createBlockerBlocksForWorkStartEnd = (
  now: number,
  workStartEndCfg?: TimelineWorkStartEndCfg,
) => {
  const blockedBlocks: BlockedBlock[] = [];

  if (!workStartEndCfg) {
    return blockedBlocks;
  }
  const daysAmount = 8;
  let i: number = 0;
  while (i < daysAmount) {
    const start = getDateTimeFromClockString(
      workStartEndCfg.endTime,
      now + i * 24 * 60 * 60 * 1000,
    );
    const end = getDateTimeFromClockString(
      workStartEndCfg.startTime,
      now + (i + 1) * 24 * 60 * 60 * 1000,
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

const createBlockerBlocksForScheduledTasks = (scheduledTasks: TaskWithReminder[]) => {
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

const mergeBlocksRecursively = (blockedBlocks: BlockedBlock[]): BlockedBlock[] => {
  for (const blockedBlock of blockedBlocks) {
    // let wasMergedInner = false;
    for (const blockedBlockInner of blockedBlocks) {
      if (
        blockedBlockInner !== blockedBlock &&
        isOverlappingBlock(blockedBlockInner, blockedBlock)
      ) {
        blockedBlock.start = Math.min(blockedBlockInner.start, blockedBlock.start);
        blockedBlock.end = Math.max(blockedBlockInner.end, blockedBlock.end);
        blockedBlock.entries = blockedBlock.entries.concat(blockedBlockInner.entries);
        // blockedBlock.entries = [...blockedBlock.entries, ...blockedBlockInner.entries];
        blockedBlocks.splice(blockedBlocks.indexOf(blockedBlockInner), 1);
        // wasMergedInner = true;
        break;
      }
    }
    // if (wasMergedInner) {
    //   break;
    // }
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
