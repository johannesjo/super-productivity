import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { BlockedBlock, SVETask } from '../schedule.model';
import { SVEType } from '../schedule.const';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';

interface Gap {
  start: number;
  end: number;
  duration: number;
}

/**
 * Places tasks while respecting blocked blocks (meetings, breaks, scheduled tasks).
 * When splitting is disabled, tasks will only be placed if they fit completely in gaps.
 * When splitting is enabled, tasks can span across blocked blocks.
 *
 * @param tasks - Unscheduled tasks to place
 * @param blockedBlocks - Meetings, breaks, scheduled tasks, work boundaries
 * @param startTime - When to start scheduling (work start or current time)
 * @param endTime - Day boundary (usually end of work day)
 * @param allowSplitting - Whether tasks can be split across blocked blocks
 * @returns Object with tasks that fit today and tasks to push to next day
 */
export const placeTasksRespectingBlocks = (
  tasks: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[],
  blockedBlocks: BlockedBlock[],
  startTime: number,
  endTime: number,
  allowSplitting: boolean,
): {
  viewEntries: SVETask[];
  tasksForNextDay: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[];
} => {
  if (tasks.length === 0) {
    return { viewEntries: [], tasksForNextDay: [] };
  }

  if (allowSplitting) {
    // When splitting is allowed, use simple sequential placement
    // Tasks will be placed one after another, ignoring blocked blocks
    // The existing split handling in create-schedule-days.ts will handle day boundaries
    return {
      viewEntries: placeTasksSequentially(tasks, startTime),
      tasksForNextDay: [],
    };
  }

  // When splitting is NOT allowed, respect blocked blocks
  const gaps = calculateGaps(blockedBlocks, startTime, endTime);
  const viewEntries: SVETask[] = [];
  const tasksForNextDay: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[] = [];

  for (const task of tasks) {
    const duration = getTimeLeftForTask(task);

    // Find the first gap that can fit this task completely
    let placed = false;
    for (let i = 0; i < gaps.length; i++) {
      const gap = gaps[i];

      if (gap.duration >= duration) {
        // Task fits! Place it in this gap
        viewEntries.push({
          id: task.id,
          type: (task as TaskWithPlannedForDayIndication).plannedForDay
            ? SVEType.TaskPlannedForDay
            : SVEType.Task,
          start: gap.start,
          data: task,
          duration,
        });

        // Update gap: reduce available space
        gap.start += duration;
        gap.duration -= duration;

        placed = true;
        break;
      }
    }

    if (!placed) {
      // Task doesn't fit in any gap today - move to next day
      tasksForNextDay.push(task);
    }
  }

  // Sort by start time for consistent ordering
  viewEntries.sort((a, b) => a.start - b.start);

  return { viewEntries, tasksForNextDay };
};

/**
 * Places tasks sequentially without respecting blocked blocks.
 * Used when splitting is allowed.
 */
const placeTasksSequentially = (
  tasks: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[],
  startTime: number,
): SVETask[] => {
  let currentTime = startTime;
  const viewEntries: SVETask[] = [];

  for (const task of tasks) {
    const duration = getTimeLeftForTask(task);

    viewEntries.push({
      id: task.id,
      type: (task as TaskWithPlannedForDayIndication).plannedForDay
        ? SVEType.TaskPlannedForDay
        : SVEType.Task,
      start: currentTime,
      data: task,
      duration,
    });

    currentTime += duration;
  }

  return viewEntries;
};

/**
 * Calculates available time gaps between blocked blocks.
 *
 * @param blockedBlocks - Sorted array of blocked time periods
 * @param startTime - Start of scheduling window
 * @param endTime - End of scheduling window
 * @returns Array of gaps with their start time, end time, and duration
 */
const calculateGaps = (
  blockedBlocks: BlockedBlock[],
  startTime: number,
  endTime: number,
): Gap[] => {
  const gaps: Gap[] = [];

  if (blockedBlocks.length === 0) {
    // No blocks - entire period is available
    return [
      {
        start: startTime,
        end: endTime,
        duration: endTime - startTime,
      },
    ];
  }

  // Sort blocks by start time
  const sortedBlocks = [...blockedBlocks].sort((a, b) => a.start - b.start);

  // Gap before first block
  const firstBlock = sortedBlocks[0];
  if (startTime < firstBlock.start) {
    gaps.push({
      start: startTime,
      end: firstBlock.start,
      duration: firstBlock.start - startTime,
    });
  }

  // Gaps between blocks
  for (let i = 0; i < sortedBlocks.length - 1; i++) {
    const currentBlock = sortedBlocks[i];
    const nextBlock = sortedBlocks[i + 1];

    if (currentBlock.end < nextBlock.start) {
      gaps.push({
        start: currentBlock.end,
        end: nextBlock.start,
        duration: nextBlock.start - currentBlock.end,
      });
    }
  }

  // Gap after last block
  const lastBlock = sortedBlocks[sortedBlocks.length - 1];
  if (lastBlock.end < endTime) {
    gaps.push({
      start: lastBlock.end,
      end: endTime,
      duration: endTime - lastBlock.end,
    });
  }

  return gaps;
};
