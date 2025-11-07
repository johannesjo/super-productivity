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
 * Intelligently places tasks into gaps between blocked blocks using flexible Best Fit bin packing.
 *
 * Strategy:
 * minimize total wasted space (fragmentation) between scheduled items, just like
 * memory allocation in operating systems, but with flexible task ordering.
 *
 * 1. Calculate all available gaps between blocked blocks
 * 2. Iteratively find the best task-gap pairing:
 *    - For EACH unplaced task, find the gap where it would leave the smallest leftover space
 *    - Select the task-gap combination with the absolute smallest waste across all possibilities
 *    - This allows larger tasks to be placed before smaller ones if it minimizes total waste
 * 3. Place the selected task in its best-fit gap and update available gaps
 * 4. Repeat until all tasks are placed or no more gaps are available
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

  // Step 3: Use flexible best-fit placement to minimize total wasted time
  // This is more sophisticated than greedy shortest-first approach
  const placements: TaskPlacement[] = [];
  const remainingTasks: typeof tasksWithDuration = [];
  const availableGaps = [...gaps]; // Clone gaps to track remaining space
  const tasksForNextDay: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[] = [];
  const unplacedTasks = [...tasksWithDuration];

  // Sort tasks by duration (shortest first) as a starting heuristic
  unplacedTasks.sort((a, b) => a.duration - b.duration);

  // Iteratively find the best task-gap pairing that minimizes waste
  while (unplacedTasks.length > 0 && availableGaps.length > 0) {
    let bestTaskIndex = -1;
    let bestGapIndex = -1;
    let smallestWaste = Infinity;

    // For each task, find its best-fit gap
    for (let taskIdx = 0; taskIdx < unplacedTasks.length; taskIdx++) {
      const { duration } = unplacedTasks[taskIdx];

      // Find the gap with smallest leftover space for this task
      for (let gapIdx = 0; gapIdx < availableGaps.length; gapIdx++) {
        const gap = availableGaps[gapIdx];

        if (gap.duration >= duration) {
          const leftoverSpace = gap.duration - duration;

          // This pairing is better than any we've seen so far
          if (leftoverSpace < smallestWaste) {
            bestTaskIndex = taskIdx;
            bestGapIndex = gapIdx;
            smallestWaste = leftoverSpace;

            // Perfect fit! Can't do better than this
            if (leftoverSpace === 0) {
              break;
            }
          }
        }
      }

      // If we found a perfect fit, no need to check other tasks
      if (smallestWaste === 0) {
        break;
      }
    }

    // If we found a task-gap pairing, place it
    if (bestTaskIndex !== -1 && bestGapIndex !== -1) {
      const { task, duration } = unplacedTasks[bestTaskIndex];
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

      // Remove placed task from unplaced list
      unplacedTasks.splice(bestTaskIndex, 1);
    } else {
      // No more tasks can fit in any gaps - break out
      break;
    }
  }

  // Handle tasks that couldn't be placed in gaps
  for (const { task, duration } of unplacedTasks) {
    if (allowSplitting) {
      // If splitting is allowed, it will be placed sequentially after
      remainingTasks.push({ task, duration });
    } else {
      // If splitting is NOT allowed, move to next day
      tasksForNextDay.push(task);
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
