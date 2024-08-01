import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { SVETask } from '../schedule.model';
import { getTimeLeftForTaskWithMinVal } from '../../../util/get-time-left-for-task';
import { SCHEDULE_TASK_MIN_DURATION_IN_MS, SVEType } from '../schedule.const';

export const createScheduleViewEntriesForNormalTasks = (
  startTime: number,
  tasks: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[],
): SVETask[] => {
  let lastTime: number | undefined;
  let prevTask: TaskWithoutReminder;

  const viewEntries: SVETask[] = [];
  tasks.forEach((task, index, arr) => {
    prevTask = arr[index - 1];

    let time: number;

    if (typeof lastTime === 'number') {
      if (prevTask) {
        time =
          lastTime +
          getTimeLeftForTaskWithMinVal(prevTask, SCHEDULE_TASK_MIN_DURATION_IN_MS);
      } else {
        throw new Error('Something weird happened');
      }
    } else {
      time = startTime;
    }

    viewEntries.push({
      id: task.id,
      type: (task as TaskWithPlannedForDayIndication).plannedForADay
        ? SVEType.TaskPlannedForDay
        : SVEType.Task,
      start: time,
      data: task,
      duration: getTimeLeftForTaskWithMinVal(task, SCHEDULE_TASK_MIN_DURATION_IN_MS),
    });

    lastTime = time;
  });

  return viewEntries;
};
