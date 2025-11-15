import { TaskPlacementStrategy } from '../../config/global-config.model';
import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';

/**
 * Sorts tasks according to the specified placement strategy.
 * @param tasks - Array of tasks to sort
 * @param strategy - The placement strategy to use
 * @returns A new sorted array of tasks
 */
export const sortTasksByStrategy = (
  tasks: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[],
  strategy: TaskPlacementStrategy,
): (TaskWithoutReminder | TaskWithPlannedForDayIndication)[] => {
  const tasksCopy = [...tasks];

  switch (strategy) {
    case 'SHORTEST_FIRST':
      return tasksCopy.sort((a, b) => getTimeLeftForTask(a) - getTimeLeftForTask(b));

    case 'LONGEST_FIRST':
      return tasksCopy.sort((a, b) => getTimeLeftForTask(b) - getTimeLeftForTask(a));

    case 'OLDEST_FIRST':
      return tasksCopy.sort((a, b) => a.created - b.created);

    case 'NEWEST_FIRST':
      return tasksCopy.sort((a, b) => b.created - a.created);

    case 'BEST_FIT':
      // Best-fit algorithm internally uses shortest-first for optimal gap filling
      return tasksCopy.sort((a, b) => getTimeLeftForTask(a) - getTimeLeftForTask(b));

    case 'DEFAULT':
    default:
      // No sorting - use existing order (sequential placement)
      return tasksCopy;
  }
};
