import { Task } from '../../tasks/task.model';
import { TimelineViewEntry, TimelineViewEntryType, TimelineWorkStartEndCfg } from '../timeline.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { getTomorrow } from '../../../util/get-tomorrow';

// const d = new Date();
// d.setTime(13);
// const FAKE_TIMELINE_EVENTS: TimelineCustomEvent[] = [{
//   title: 'Mittagspause',
//   duration: 60000 * 60,
//   start: d.getTime(),
//   icon: 'restaurant'
// }, {
//   title: 'Spazieren am Nachmittag',
//   duration: 60000 * 60 * .25,
//   start: Date.now() + 60000 * 60 * 2,
//   icon: 'nature',
// }];

export const mapToViewEntries = (
  tasks: Task[],
  currentId: string | null,
  workStartEndCfg?: TimelineWorkStartEndCfg,
  now: number = Date.now(),
): TimelineViewEntry[] => {
  let startTime = now;
  const params: any = {tasks, currentId, workStartEndCfg, now};
  console.log('mapToViewEntries', params, {asString: JSON.stringify(params)});

  if (workStartEndCfg) {
    const startTimeToday = getDateTimeFromClockString(workStartEndCfg.startTime, now);
    if (startTimeToday > now && !currentId) {
      startTime = startTimeToday;
    }
  }
  const initialTasks: Task[] = currentId
    ? resortTasksWithCurrentFirst(currentId, tasks)
    : tasks;

  const [viewEntries, scheduledTasks] = createViewEntriesForNormalTasks(startTime, initialTasks);

  addVEForScheduled(scheduledTasks, viewEntries);
  // addVEForCustomEvents(FAKE_TIMELINE_EVENTS, viewEntries);

  viewEntries.sort((a, b) => a.time - b.time);

  addVEForDayStartEnd(viewEntries, now, currentId, workStartEndCfg);
  // viewEntries.sort((a, b) => a.time - b.time);

  console.log('mapToViewEntriesE', viewEntries, {asString: JSON.stringify(viewEntries)});
  return viewEntries;
};

const addVEForDayStartEnd = (
  viewEntries: TimelineViewEntry[],
  now: number,
  currentId: null | string,
  workStartEndCfg?: TimelineWorkStartEndCfg,
) => {
  if (!workStartEndCfg) {
    return;
  }
  const viewEntriesBefore: TimelineViewEntry[] = viewEntries.slice(0);
  const startTimeToday = getDateTimeFromClockString(workStartEndCfg.startTime, now);
  const startTimeTomorrow = getDateTimeFromClockString(workStartEndCfg.startTime, getTomorrow());
  const endTimeToday = getDateTimeFromClockString(workStartEndCfg.endTime, now);

  let firstDifference: number;
  let daySwitchIndex: number = -1;

  viewEntriesBefore.forEach((entry, index) => {
    const timeEndForEntry = (entry.time && entry.type === TimelineViewEntryType.Task)
      ? entry.time + getTimeLeftForTask(entry.data)
      : entry.time;

    if (entry.time && timeEndForEntry && timeEndForEntry >= endTimeToday) {
      if (entry.time >= endTimeToday) {
        if (!firstDifference) {
          firstDifference = startTimeTomorrow - entry.time;
          daySwitchIndex = index;
        }
        entry.time = entry.time + firstDifference;
      } else {
        // // split task
        const timeToGoAfterWorkEnd = (timeEndForEntry - endTimeToday);
        const timeDoneBeforeWorkEnd = getTimeLeftForTask(entry.data as Task) - timeToGoAfterWorkEnd;

        if (!firstDifference) {
          firstDifference = startTimeTomorrow - entry.time - timeDoneBeforeWorkEnd;
          daySwitchIndex = index + 1;
        }
        entry.type = TimelineViewEntryType.SplitTask;
        const splitInsertIndex = daySwitchIndex;

        const splitTask = entry.data;

        viewEntries.splice(splitInsertIndex, 0, {
          id: (splitTask as Task).id + '__' + splitInsertIndex,
          time: startTimeTomorrow,
          type: TimelineViewEntryType.SplitTaskContinued,
          data: {
            title: (splitTask as Task).title,
            timeToGo: timeToGoAfterWorkEnd,
          },
          isHideTime: false,
        });
      }
    }
  });

  if (daySwitchIndex > -1) {
    viewEntries.splice(daySwitchIndex, 0, {
      id: 'START_TOMORROW',
      time: startTimeTomorrow,
      type: TimelineViewEntryType.WorkdayStart,
      data: workStartEndCfg,
      isHideTime: true,
    });
    viewEntries.splice(daySwitchIndex, 0, {
      id: 'END_TODAY',
      time: endTimeToday,
      type: TimelineViewEntryType.WorkdayEnd,
      data: workStartEndCfg,
      isHideTime: true,
    });
  }
  if (startTimeToday > now && !currentId) {
    viewEntries.unshift({
      id: 'START_TODAY',
      time: startTimeToday,
      type: TimelineViewEntryType.WorkdayStart,
      data: workStartEndCfg,
      isHideTime: true,
    });
  }
};

const resortTasksWithCurrentFirst = (currentId: string, tasks: Task[]): Task[] => {
  let newTasks = tasks;
  const currentTask = tasks.find(t => t.id === currentId);
  if (currentTask) {
    newTasks = [currentTask, ...tasks.filter(t => t.id !== currentId)] as Task[];
  }
  return newTasks;
};

const createViewEntriesForNormalTasks = (startTime: number, tasks: Task[]): [TimelineViewEntry[], Task[]] => {
  let lastTime: any;
  let prev: any;

  const sortedTasks: Task[] = tasks;
  const scheduledTasks: Task[] = [];
  const viewEntries: TimelineViewEntry[] = [];

  sortedTasks.forEach((task, index, arr) => {
    // NOTE: not pretty but performant
    if (task.reminderId && task.plannedAt) {
      scheduledTasks.push(task);
      return;
    }

    prev = arr[index - 1];
    let time;

    if (lastTime) {
      if (prev) {
        time = lastTime + getTimeLeftForTask(prev);
      } else {
        throw new Error('Something weird happened');
      }
    } else {
      time = startTime;
    }

    viewEntries.push({
      id: task.id,
      type: TimelineViewEntryType.Task,
      time,
      data: task,
      // TODO add isSameTimeAsPrevious at the very end
      isHideTime: (time === lastTime),
    });

    lastTime = time;
  });

  return [viewEntries, scheduledTasks];
};

const addVEForScheduled = (scheduledTasks: Task[], viewEntries: TimelineViewEntry[]) => {
  if (!scheduledTasks.length) {
    return;
  }

  scheduledTasks.forEach((scheduledTask, i) => {
    const firstEntryBeforeIndex = viewEntries.findIndex(
      viewEntry =>
        viewEntry.time
        && viewEntry.time !== 0
        && viewEntry.time >= (scheduledTask.plannedAt as number)
    );

    const scheduledTaskDuration = getTimeLeftForTask(scheduledTask);

    viewEntries.splice(firstEntryBeforeIndex || 0, 0, {
      id: scheduledTask.id,
      time: scheduledTask.plannedAt as number,
      type: TimelineViewEntryType.ScheduledTask,
      data: scheduledTask,
      isHideTime: false,
    });

    const viewEntryForSplitTask: TimelineViewEntry | undefined = viewEntries[firstEntryBeforeIndex - 1];
    const splitTask: Task | undefined = viewEntryForSplitTask?.data as Task;
    const isAddSplitTask = (splitTask && (getTimeLeftForTask(splitTask) > 0));
    if (viewEntryForSplitTask && isAddSplitTask) {
      const timeLeftForCompleteSplitTask = getTimeLeftForTask(splitTask);
      const timePlannedForSplitTaskBefore = (scheduledTask as Task).plannedAt as number - (viewEntryForSplitTask as any).time as number;
      const timePlannedForSplitTaskContinued = timeLeftForCompleteSplitTask - timePlannedForSplitTaskBefore;

      viewEntryForSplitTask.type = TimelineViewEntryType.SplitTask;
      viewEntries.splice(firstEntryBeforeIndex + 1, 0, {
        id: i + '_' + (splitTask as Task).id,
        time: (scheduledTask.plannedAt as number) + scheduledTaskDuration,
        type: TimelineViewEntryType.SplitTaskContinued,
        data: {
          title: (splitTask as Task).title,
          timeToGo: timePlannedForSplitTaskContinued,
        },
        isHideTime: false,
      });
    }

    const startIndexOfFollowing = firstEntryBeforeIndex === -1
      // TODO check
      ? 0 + (isAddSplitTask ? 3 : 2)
      : firstEntryBeforeIndex + (isAddSplitTask ? 2 : 1);
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let j = startIndexOfFollowing; j < viewEntries.length; j++) {
      const viewEntry = viewEntries[j];
      if (viewEntry.type === TimelineViewEntryType.Task) {
        viewEntry.time = viewEntry.time + scheduledTaskDuration;
      }
    }
  });
};

const getTimeLeftForTask = (task: Task): number => {
  return Math.max(0, task.timeEstimate - task.timeSpent) || 0;
};

// const addVEForCustomEvents = (customEvents: TimelineCustomEvent[], viewEntries: TimelineViewEntry[]) => {
//   if (!customEvents.length) {
//     return;
//   }
//
//   customEvents.forEach((customEvent, i) => {
//     if ((customEvent.start + customEvent.duration) <= Date.now()) {
//       return;
//     }
//
//     const firstEntryBeforeIndex = viewEntries.findIndex(
//       viewEntry =>
//         viewEntry.time
//         && viewEntry.time !== 0
//         && viewEntry.time >= (customEvent.start as number)
//     );
//
//     viewEntries.splice(firstEntryBeforeIndex || 0, 0, {
//       id: customEvent.title,
//       time: customEvent.start,
//       type: TimelineViewEntryType.CustomEvent,
//       data: customEvent,
//       isHideTime: false,
//     });
//
//     const viewEntryForSplitTask: TimelineViewEntry | undefined = viewEntries[firstEntryBeforeIndex - 1];
//     const splitTask: Task | undefined = viewEntryForSplitTask?.data as Task;
//     const isAddSplitTask = (splitTask && (getTimeLeftForTask(splitTask) > 0));
//     if (viewEntryForSplitTask && isAddSplitTask) {
//       const timeLeftForCompleteSplitTask = getTimeLeftForTask(splitTask);
//       const timePlannedForSplitTaskBefore = (customEvent).start as number - (viewEntryForSplitTask as any).time as number;
//       const timePlannedForSplitTaskContinued = timeLeftForCompleteSplitTask - timePlannedForSplitTaskBefore;
//
//       viewEntryForSplitTask.type = TimelineViewEntryType.SplitTask;
//       viewEntries.splice(firstEntryBeforeIndex + 1, 0, {
//         id: (splitTask as Task).id,
//         time: customEvent.start + customEvent.duration,
//         type: TimelineViewEntryType.SplitTaskContinued,
//         data: {
//           title: (splitTask as Task).title,
//           timeToGo: timePlannedForSplitTaskContinued,
//         },
//         isHideTime: true,
//       });
//     }
//
//     const startIndexOfFollowing = firstEntryBeforeIndex + (isAddSplitTask ? 2 : 1);
//     // eslint-disable-next-line @typescript-eslint/prefer-for-of
//     for (let j = startIndexOfFollowing; j < viewEntries.length; j++) {
//       const viewEntry = viewEntries[j];
//       if (viewEntry.time) {
//         viewEntry.time = viewEntry.time + customEvent.duration;
//       }
//     }
//   });
// };
