import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';

export const getTasksWithinAndBeyondBudget = (
  tasks: TaskWithoutReminder[],
  budget: number,
  bufferPerTaskMs: number = 0,
): {
  beyond: (TaskWithPlannedForDayIndication | TaskWithoutReminder)[];
  within: (TaskWithPlannedForDayIndication | TaskWithoutReminder)[];
  isSomeTimeLeftForLastOverBudget: boolean;
} => {
  const beyond: (TaskWithPlannedForDayIndication | TaskWithoutReminder)[] = [];
  const within: (TaskWithPlannedForDayIndication | TaskWithoutReminder)[] = [];

  let remainingBudget = budget;
  let isOverBudget = false;

  // NOTE: for loops can sometimes be faster than forEach
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (isOverBudget) {
      beyond.push(task);
      continue;
    }

    const timeLeftForTask = getTimeLeftForTask(task);
    const requiredWithBuffer = timeLeftForTask + bufferPerTaskMs;
    if (requiredWithBuffer > remainingBudget) {
      isOverBudget = true;
      beyond.push(task);
    } else {
      within.push(task);
      remainingBudget -= requiredWithBuffer;
    }
  }

  return { beyond, within, isSomeTimeLeftForLastOverBudget: remainingBudget > 0 };
};
