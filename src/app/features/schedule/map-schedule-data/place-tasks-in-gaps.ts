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

interface TaskPlacement {
  task: TaskWithoutReminder | TaskWithPlannedForDayIndication;
  start: number;
  duration: number;
  gapIndex: number;
}

/**
 * Intelligently places tasks into gaps between blocked blocks using Best Fit bin packing.
 *
 * Algorithm Strategy (Best Fit Bin Packing):
 * 1. Calculate all available gaps between blocked blocks
 * 2. Sort tasks by remaining time (shortest first for gap optimization)
 * 3. For each task, find the smallest gap that can fit it completely
 * 4. Place task in that gap, updating gap availability
 * 5. Tasks that don't fit in any gap:
 *    - If splitting allowed: placed sequentially after last block (may split across blocks/days)
 *    - If splitting NOT allowed: returned as tasksForNextDay
 *
 * @param tasks - Unscheduled tasks to place
 * @param blockedBlocks - Meetings, breaks, scheduled tasks, work boundaries
 * @param startTime - When to start scheduling (work start or current time)
 * @param endTime - Day boundary (usually end of work day)
 * @param allowSplitting - Whether tasks can be split across blocked blocks
 * @returns Object with tasks that fit today and tasks to push to next day
 */
export const placeTasksInGaps = (
  tasks: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[],
  blockedBlocks: BlockedBlock[],
  startTime: number,
  endTime: number,
  allowSplitting: boolean = true,
): {
  viewEntries: SVETask[];
  tasksForNextDay: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[];
} => {
  if (tasks.length === 0) {
    return { viewEntries: [], tasksForNextDay: [] };
  }

  // Step 1: Calculate available gaps between blocked blocks
  const gaps = calculateGaps(blockedBlocks, startTime, endTime);

  // Step 2: Prepare tasks with their durations
  const tasksWithDuration = tasks.map((task) => ({
    task,
    duration: getTimeLeftForTask(task),
  }));

  // Step 3: Sort tasks by duration (shortest first - better gap utilization)
  tasksWithDuration.sort((a, b) => a.duration - b.duration);

  // Step 4: Place tasks into gaps using Best Fit algorithm
  const placements: TaskPlacement[] = [];
  const remainingTasks: typeof tasksWithDuration = [];
  const availableGaps = [...gaps]; // Clone gaps to track remaining space
  const tasksForNextDay: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[] = [];

  for (const { task, duration } of tasksWithDuration) {
    // Find the smallest gap that can fit this task completely
    let bestGapIndex = -1;
    let bestGapSize = Infinity;

    for (let i = 0; i < availableGaps.length; i++) {
      const gap = availableGaps[i];
      // Task must fit completely in the gap
      if (gap.duration >= duration && gap.duration < bestGapSize) {
        bestGapIndex = i;
        bestGapSize = gap.duration;
      }
    }

    if (bestGapIndex !== -1) {
      // Found a gap! Place the task
      const gap = availableGaps[bestGapIndex];
      placements.push({
        task,
        start: gap.start,
        duration,
        gapIndex: bestGapIndex,
      });

      // Update gap: reduce available space
      gap.start += duration;
      gap.duration -= duration;

      // Remove gap if fully used
      if (gap.duration <= 0) {
        availableGaps.splice(bestGapIndex, 1);
      }
    } else {
      // No gap can fit this task
      if (allowSplitting) {
        // If splitting is allowed, it will be placed sequentially after
        remainingTasks.push({ task, duration });
      } else {
        // If splitting is NOT allowed, move to next day
        tasksForNextDay.push(task);
      }
    }
  }

  // Step 5: Create schedule view entries from placements
  const viewEntries: SVETask[] = [];

  // Add tasks that fit in gaps (NO SPLITS!)
  for (const placement of placements) {
    viewEntries.push({
      id: placement.task.id,
      type: (placement.task as TaskWithPlannedForDayIndication).plannedForDay
        ? SVEType.TaskPlannedForDay
        : SVEType.Task,
      start: placement.start,
      data: placement.task,
      duration: placement.duration,
    });
  }

  // Add remaining tasks sequentially after last blocked block (may split)
  if (remainingTasks.length > 0) {
    const lastBlock = blockedBlocks[blockedBlocks.length - 1];
    let sequentialStart = lastBlock ? lastBlock.end : startTime;

    for (const { task, duration } of remainingTasks) {
      viewEntries.push({
        id: task.id,
        type: (task as TaskWithPlannedForDayIndication).plannedForDay
          ? SVEType.TaskPlannedForDay
          : SVEType.Task,
        start: sequentialStart,
        data: task,
        duration,
      });
      sequentialStart += duration;
    }
  }

  // Sort by start time for consistent ordering
  viewEntries.sort((a, b) => a.start - b.start);

  return { viewEntries, tasksForNextDay };
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
