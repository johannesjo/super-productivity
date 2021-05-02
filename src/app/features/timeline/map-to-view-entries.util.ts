import { Task } from '../tasks/task.model';
import { TimelineCustomEvent, TimelineViewEntry, TimelineViewEntryType, TimelineWorkStartEnd } from './timeline.model';
import { getDateTimeFromClockString } from '../../util/get-date-time-from-clock-string';
import { getTomorrow } from '../../util/get-tomorrow';

const d = new Date();
d.setTime(13);
const FAKE_TIMELINE_EVENTS: TimelineCustomEvent[] = [{
  title: 'Mittagspause',
  duration: 60000 * 60,
  start: d.getTime(),
  icon: 'restaurant'
// }, {
//   title: 'Spazieren am Nachmittag',
//   duration: 60000 * 60 * .25,
//   start: Date.now() + 60000 * 60 * 2,
//   icon: 'nature',
}];
// const FAKE_TIMELINE_EVENTS: TimelineCustomEvent[] = [];

const FAKE_WORK_START_END: TimelineWorkStartEnd = {
  // startTime: '9:00',
  // endTime: '17:00',
  startTime: '13:00',
  endTime: '17:00',
};

export const mapToViewEntries = (tasks: Task[], currentId: string | null, now: number = Date.now()): TimelineViewEntry[] => {
  let startTime = now;

  if (FAKE_WORK_START_END) {
    const startTimeToday = getDateTimeFromClockString(FAKE_WORK_START_END.startTime);
    // const endTimeToday = getDateTimeFromClockString(FAKE_WORK_START_END.endTime);
    console.log(startTimeToday > now);

    if (startTimeToday > now && !currentId) {
      startTime = startTimeToday;
    }
  }
  const initialTasks: Task[] = currentId
    ? resortTasksWithCurrentFirst(currentId, tasks)
    : tasks;

  const [viewEntries, scheduledTasks] = createViewEntriesForNormalTasks(startTime, initialTasks);

  // TODO refactor as we don't need to pretend to have pure functions here
  const viewEntriesWithScheduled = addViewEntriesForScheduled(scheduledTasks, viewEntries);
  const viewEntriesWithCustomEvents = addViewEntriesForCustomEvents(FAKE_TIMELINE_EVENTS, viewEntriesWithScheduled);
  // const lastEntry = viewEntries && viewEntries[viewEntries.length - 1];
  // console.log({lastEntry});
  //
  // if (lastEntry && lastEntry.type === TimelineViewEntryType.TaskFull) {
  //   const task = lastEntry.data;
  //   viewEntries.push({
  //     id: 'END',
  //     type: TimelineViewEntryType.WorkdayEnd,
  //     time: lastTime + Math.max(0, task.timeEstimate - task.timeSpent)
  //   });
  // }

  if (FAKE_WORK_START_END) {
    const startTimeToday = getDateTimeFromClockString(FAKE_WORK_START_END.startTime);
    const startTimeTomorrow = getDateTimeFromClockString(FAKE_WORK_START_END.startTime, getTomorrow());
    const endTimeToday = getDateTimeFromClockString(FAKE_WORK_START_END.endTime);

    let firstDifference: number;
    let daySwitchIndex: number = -1;

    viewEntriesWithCustomEvents.forEach((entry, index) => {
      // TODO insert entry
      // TODO split logic
      const timeEndForEntry = (entry.time && entry.type === TimelineViewEntryType.Task)
        ? entry.time + getTimeForTask(entry.data)
        : entry.time;

      if (entry.time && timeEndForEntry && timeEndForEntry >= endTimeToday) {
        if (!firstDifference) {
          firstDifference = startTimeTomorrow - entry.time;
          daySwitchIndex = index;
        }
        if (entry.time >= endTimeToday) {
          entry.time = entry.time + firstDifference;
        } else {
          // split task
          daySwitchIndex = index + 1;

        }

      }
    });

    if (daySwitchIndex > -1) {
      startTime = startTimeToday;
      viewEntriesWithCustomEvents.splice(daySwitchIndex, 0, {
        id: 'START_TOMORROW',
        time: startTimeTomorrow,
        type: TimelineViewEntryType.WorkdayStart,
        data: FAKE_WORK_START_END,
        isHideTime: true,
      });
      viewEntriesWithCustomEvents.splice(daySwitchIndex, 0, {
        id: 'END_TODAY',
        time: endTimeToday,
        type: TimelineViewEntryType.WorkdayEnd,
        data: FAKE_WORK_START_END,
        isHideTime: true,
      });
    }
    if (startTimeToday > now && !currentId) {
      startTime = startTimeToday;
      viewEntriesWithCustomEvents.unshift({
        id: 'START_TODAY',
        time: startTime,
        type: TimelineViewEntryType.WorkdayStart,
        data: FAKE_WORK_START_END,
        isHideTime: true,
      });
    }
  }

  return viewEntriesWithCustomEvents;
};

// const addViewEntriesForWorkStartEnd = (workStartConfig: TimelineWorkStartEnd, viewEntries: TimelineViewEntry[], startTime: number): TimelineViewEntry [] => {
//   if (!workStartConfig.length) {
//     return viewEntries;
//   }
//   const newViewEntries: TimelineViewEntry[] = viewEntries.slice(0);
//   workStartEndEntries.forEach(startEnd => {
//     const startTimeToday = getDateTimeFromClockString(startEnd.startTime);
//     const endTimeToday = getDateTimeFromClockString(startEnd.endTime);
//
//     if(startTimeToday > startTime) {
//
//     }
//
//     const firstEntryBeforeIndex = newViewEntries.findIndex(
//       viewEntry =>
//         viewEntry.time
//         && viewEntry.time !== 0
//         && viewEntry.time >= (scheduledTask.plannedAt as number)
//     );
//
//     // TODO check once we have more different
//     const viewEntryForSplitTask: TimelineViewEntry | undefined = newViewEntries[firstEntryBeforeIndex - 1];
//     const splitTask: Task | undefined = viewEntryForSplitTask?.data as Task;
//
//     const scheduledTaskDuration = getTimeForTask(scheduledTask);
//
//     newViewEntries.splice(firstEntryBeforeIndex || 0, 0, {
//       id: scheduledTask.id,
//       time: scheduledTask.plannedAt,
//       type: TimelineViewEntryType.ScheduledTask,
//       data: scheduledTask,
//       isSameTimeAsPrevious: false,
//     });
//
//     const isAddSplitTask = (splitTask && (splitTask.timeEstimate - splitTask.timeSpent > 0));
//     if (isAddSplitTask) {
//       // const splitTime = getTimeForTask(splitTask) - scheduledTaskDuration;
//       // const splitStr = msToString(splitTime);
//       viewEntryForSplitTask.type = TimelineViewEntryType.SplitTask;
//       newViewEntries.splice(firstEntryBeforeIndex + 1, 0, {
//         id: (splitTask as Task).id,
//         time: (scheduledTask.plannedAt as number) + scheduledTaskDuration,
//         type: TimelineViewEntryType.SplitTaskContinued,
//         // data: '... ' + (splitTask as Task).title + ' (' + splitStr + ')',
//         data: '... ' + (splitTask as Task).title,
//         isSameTimeAsPrevious: true,
//       });
//     }
//
//     const startIndexOfFollowing = firstEntryBeforeIndex + (isAddSplitTask ? 2 : 1);
//     // eslint-disable-next-line @typescript-eslint/prefer-for-of
//     for (let j = startIndexOfFollowing; j < newViewEntries.length; j++) {
//       const viewEntry = newViewEntries[j];
//       if (viewEntry.time) {
//         viewEntry.time = viewEntry.time + scheduledTaskDuration;
//       }
//     }
//   });
//
//   return newViewEntries;
// };

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
        time = lastTime + getTimeForTask(prev);
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

const addViewEntriesForScheduled = (scheduledTasks: Task[], viewEntries: TimelineViewEntry[]): TimelineViewEntry[] => {
  if (!scheduledTasks.length) {
    return viewEntries;
  }
  const newViewEntries: TimelineViewEntry[] = viewEntries.slice(0);

  scheduledTasks.forEach((scheduledTask, i) => {
    const firstEntryBeforeIndex = newViewEntries.findIndex(
      viewEntry =>
        viewEntry.time
        && viewEntry.time !== 0
        && viewEntry.time >= (scheduledTask.plannedAt as number)
    );

    // TODO check once we have more different
    const viewEntryForSplitTask: TimelineViewEntry | undefined = newViewEntries[firstEntryBeforeIndex - 1];
    const splitTask: Task | undefined = viewEntryForSplitTask?.data as Task;

    const scheduledTaskDuration = getTimeForTask(scheduledTask);

    newViewEntries.splice(firstEntryBeforeIndex || 0, 0, {
      id: scheduledTask.id,
      time: scheduledTask.plannedAt,
      type: TimelineViewEntryType.ScheduledTask,
      data: scheduledTask,
      isHideTime: false,
    });

    const isAddSplitTask = (splitTask && (splitTask.timeEstimate - splitTask.timeSpent > 0));
    if (isAddSplitTask) {
      // const splitTime = getTimeForTask(splitTask) - scheduledTaskDuration;
      // const splitStr = msToString(splitTime);
      viewEntryForSplitTask.type = TimelineViewEntryType.SplitTask;
      newViewEntries.splice(firstEntryBeforeIndex + 1, 0, {
        id: (splitTask as Task).id,
        time: (scheduledTask.plannedAt as number) + scheduledTaskDuration,
        type: TimelineViewEntryType.SplitTaskContinued,
        // data: '... ' + (splitTask as Task).title + ' (' + splitStr + ')',
        data: '... ' + (splitTask as Task).title,
        isHideTime: true,
      });
    }

    const startIndexOfFollowing = firstEntryBeforeIndex + (isAddSplitTask ? 2 : 1);
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let j = startIndexOfFollowing; j < newViewEntries.length; j++) {
      const viewEntry = newViewEntries[j];
      if (viewEntry.time) {
        viewEntry.time = viewEntry.time + scheduledTaskDuration;
      }
    }
  });

  return newViewEntries;
};

const getTimeForTask = (task: Task): number => {
  return Math.max(0, task.timeEstimate - task.timeSpent) || 0;
};

const addViewEntriesForCustomEvents = (customEvents: TimelineCustomEvent[], viewEntries: TimelineViewEntry[]): TimelineViewEntry [] => {
  if (!customEvents.length) {
    return viewEntries;
  }
  const newViewEntries: TimelineViewEntry[] = viewEntries.slice(0);

  customEvents.forEach((customEvent, i) => {
    if ((customEvent.start + customEvent.duration) <= Date.now()) {
      return;
    }

    const firstEntryBeforeIndex = newViewEntries.findIndex(
      viewEntry =>
        viewEntry.time
        && viewEntry.time !== 0
        && viewEntry.time >= (customEvent.start as number)
    );

    // TODO check once we have more different
    const viewEntryForSplitTask: TimelineViewEntry | undefined = newViewEntries[firstEntryBeforeIndex - 1];
    const splitTask: Task | undefined = viewEntryForSplitTask?.data as Task;

    newViewEntries.splice(firstEntryBeforeIndex || 0, 0, {
      id: customEvent.title,
      time: customEvent.start,
      type: TimelineViewEntryType.CustomEvent,
      data: customEvent,
      isHideTime: false,
    });

    const isAddSplitTask = (splitTask && (splitTask.timeEstimate - splitTask.timeSpent > 0));
    if (isAddSplitTask) {
      // const splitTime = getTimeForTask(splitTask) - customEvent.duration;
      // const splitStr = msToString(splitTime);
      viewEntryForSplitTask.type = TimelineViewEntryType.SplitTask;
      newViewEntries.splice(firstEntryBeforeIndex + 1, 0, {
        id: (splitTask as Task).id,
        time: customEvent.start + customEvent.duration,
        type: TimelineViewEntryType.SplitTaskContinued,
        // data: '... ' + (splitTask as Task).title + ' (' + splitStr + ')',
        data: '... ' + (splitTask as Task).title + ' (continued)',
        isHideTime: true,
      });
    }

    const startIndexOfFollowing = firstEntryBeforeIndex + (isAddSplitTask ? 2 : 1);
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let j = startIndexOfFollowing; j < newViewEntries.length; j++) {
      const viewEntry = newViewEntries[j];
      if (viewEntry.time) {
        viewEntry.time = viewEntry.time + customEvent.duration;
      }
    }
  });

  return newViewEntries;
};
