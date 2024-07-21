import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { TimelineViewEntryTask } from '../timeline.model';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { TimelineViewEntryType } from '../timeline.const';

export const createTimelineViewEntriesForNormalTasks = (
  startTime: number,
  tasks: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[],
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
      type: (task as TaskWithPlannedForDayIndication).plannedForADay
        ? TimelineViewEntryType.TaskPlannedForDay
        : TimelineViewEntryType.Task,
      start: time,
      data: task,
      isHideTime: time === lastTime,
    });

    lastTime = time;
  });

  return viewEntries;
};

// export const createTimelineViewEntriesForNonScheduledRepeatProjections = (
//   startTime: number,
//   taskRepeatCfgs: TaskRepeatCfg[],
// ): TimelineViewEntryTaskNonScheduledRepeatProjection[] => {
//   let lastTime: number;
//   let prevRepeatCfg: TaskRepeatCfg;
//
//   const viewEntries: TimelineViewEntryTaskNonScheduledRepeatProjection[] = [];
//   taskRepeatCfgs.forEach((taskRepeatCfg, index, arr) => {
//     prevRepeatCfg = arr[index - 1];
//
//     let time: number;
//
//     if (lastTime) {
//       if (prevRepeatCfg) {
//         time = lastTime + (taskRepeatCfg?.defaultEstimate || 0);
//       } else {
//         throw new Error('Something weird happened');
//       }
//     } else {
//       time = startTime;
//     }
//
//     viewEntries.push({
//       id: taskRepeatCfg.id,
//       type: TimelineViewEntryType.NonScheduledRepeatTaskProjection,
//       start: time,
//       data: taskRepeatCfg,
//       isHideTime: time === lastTime,
//     });
//
//     lastTime = time;
//   });
//
//   return viewEntries;
// };
