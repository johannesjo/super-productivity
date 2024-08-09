import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { SVETask } from '../schedule.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { SVEType } from '../schedule.const';

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
        time = lastTime + getTimeLeftForTask(prevTask);
      } else {
        throw new Error('Something weird happened');
      }
    } else {
      time = startTime;
    }

    viewEntries.push({
      id: task.id,
      type: (task as TaskWithPlannedForDayIndication).plannedForDay
        ? SVEType.TaskPlannedForDay
        : SVEType.Task,
      start: time,
      data: task,
      duration: getTimeLeftForTask(task),
    });

    lastTime = time;
  });

  return viewEntries;
};
