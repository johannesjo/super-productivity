import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';

export const getTasksWithinAndBeyondBudget = (
  tasks: TaskWithoutReminder[],
  budget: number,
): {
  beyond: (TaskWithPlannedForDayIndication | TaskWithoutReminder)[];
  within: (TaskWithPlannedForDayIndication | TaskWithoutReminder)[];
} => {
  const beyond: (TaskWithPlannedForDayIndication | TaskWithoutReminder)[] = [];
  const within: (TaskWithPlannedForDayIndication | TaskWithoutReminder)[] = [];

  let remainingBudget = budget;
  // TODO probably can be optimized
  let isOverBudget = false;
  tasks.forEach((task) => {
    // console.log(remainingBudget / 60 / 60 / 1000);

    if (isOverBudget) {
      beyond.push(task);
      return;
    }

    const timeLeftForTask = getTimeLeftForTask(task);
    if (timeLeftForTask > remainingBudget) {
      isOverBudget = true;
      beyond.push(task);
    } else {
      within.push(task);
      remainingBudget -= timeLeftForTask;
    }
  });
  // console.log(remainingBudget);
  // console.log(beyond);

  return { beyond, within };
};
