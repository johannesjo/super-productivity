import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { getTimeLeftForTaskWithMinVal } from '../../../util/get-time-left-for-task';
import { SCHEDULE_TASK_MIN_DURATION_IN_MS } from '../schedule.const';

export const getTasksWithinAndBeyondBudget = (
  tasks: TaskWithoutReminder[],
  budget: number,
): {
  beyond: TaskWithoutReminder[];
  within: TaskWithPlannedForDayIndication[];
} => {
  const beyond: TaskWithoutReminder[] = [];
  const within: TaskWithPlannedForDayIndication[] = [];

  let remainingBudget = budget;
  // TODO probably can be optimized
  tasks.forEach((task) => {
    // console.log(remainingBudget / 60 / 60 / 1000);

    const timeLeftForTask = getTimeLeftForTaskWithMinVal(
      task,
      SCHEDULE_TASK_MIN_DURATION_IN_MS,
    );
    if (timeLeftForTask > remainingBudget) {
      beyond.push(task);
    } else {
      within.push({
        ...task,
        plannedForADay: true,
      });
      remainingBudget -= timeLeftForTask;
    }
  });
  console.log(remainingBudget);
  console.log(beyond);

  return { beyond, within };
};
