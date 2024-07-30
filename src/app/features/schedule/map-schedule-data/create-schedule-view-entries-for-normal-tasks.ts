import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { ScheduleViewEntryTask } from '../schedule.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { ScheduleViewEntryType } from '../schedule.const';

export const createScheduleViewEntriesForNormalTasks = (
  startTime: number,
  tasks: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[],
): ScheduleViewEntryTask[] => {
  let lastTime: number;
  let prevTask: TaskWithoutReminder;

  const viewEntries: ScheduleViewEntryTask[] = [];
  tasks.forEach((task, index, arr) => {
    prevTask = arr[index - 1];

    let time: number;

    if (lastTime) {
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
      type: (task as TaskWithPlannedForDayIndication).plannedForADay
        ? ScheduleViewEntryType.TaskPlannedForDay
        : ScheduleViewEntryType.Task,
      start: time,
      data: task,
    });

    lastTime = time;
  });

  return viewEntries;
};
