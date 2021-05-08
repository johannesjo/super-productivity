import { TaskWithoutReminder } from '../../tasks/task.model';
import { TimelineViewEntryTask } from '../timeline.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { TimelineViewEntryType } from '../timeline.const';

export const createTimelineViewEntriesForNormalTasks = (
  startTime: number,
  tasks: TaskWithoutReminder[],
): TimelineViewEntryTask[] => {
  let lastTime: number;
  let prevTask: TaskWithoutReminder;

  const viewEntries: TimelineViewEntryTask[] = [];
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
      type: TimelineViewEntryType.Task,
      start: time,
      data: task,
      isHideTime: time === lastTime,
    });

    lastTime = time;
  });

  return viewEntries;
};
