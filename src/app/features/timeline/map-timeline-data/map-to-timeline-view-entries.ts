import { Task, TaskPlanned, TaskWithoutReminder } from '../../tasks/task.model';
import {
  BlockedBlock,
  BlockedBlockType,
  TimelineViewEntry,
  TimelineViewEntrySplitTaskContinued,
  TimelineViewEntryTask,
  TimelineWorkStartEndCfg,
} from '../timeline.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { createSortedBlockerBlocks } from './create-sorted-blocker-blocks';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { createTimelineViewEntriesForNormalTasks } from './create-timeline-view-entries-for-normal-tasks';
import {
  TIMELINE_MOVEABLE_TYPES,
  TIMELINE_VIEW_TYPE_ORDER,
  TimelineViewEntryType,
} from '../timeline.const';
import * as moment from 'moment';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';

// const debug = (...args: any) => console.log(...args);
const debug = (...args: any) => undefined;

export const mapToTimelineViewEntries = (
  tasks: Task[],
  scheduledTasks: TaskPlanned[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  currentId: string | null,
  workStartEndCfg?: TimelineWorkStartEndCfg,
  now: number = Date.now(),
): TimelineViewEntry[] => {
  let startTime = now;
  if (!tasks.length && !scheduledTasks.length) {
    return [];
  }

  const params: any = { tasks, currentId, scheduledTasks, workStartEndCfg, now };
  console.log('mapToViewEntries', params, { asString: JSON.stringify(params) });

  if (workStartEndCfg) {
    const startTimeToday = getDateTimeFromClockString(workStartEndCfg.startTime, now);
    if (startTimeToday > now) {
      startTime = startTimeToday;
    }
  }

  const initialTasks: Task[] = currentId
    ? resortTasksWithCurrentFirst(currentId, tasks)
    : tasks;

  const nonScheduledTasks: TaskWithoutReminder[] = initialTasks.filter(
    (task) => !(task.reminderId && task.plannedAt),
  ) as TaskWithoutReminder[];

  const viewEntries: TimelineViewEntry[] = createTimelineViewEntriesForNormalTasks(
    startTime,
    nonScheduledTasks,
  );

  const blockedBlocks = createSortedBlockerBlocks(
    scheduledTasks,
    scheduledTaskRepeatCfgs,
    workStartEndCfg,
    now,
  );

  insertBlockedBlocksViewEntries(
    viewEntries as TimelineViewEntryTask[],
    blockedBlocks,
    now,
  );

  // CLEANUP
  // -------
  viewEntries.sort((a, b) => {
    if (a.start - b.start === 0) {
      return TIMELINE_VIEW_TYPE_ORDER[a.type] - TIMELINE_VIEW_TYPE_ORDER[b.type];
    }
    return a.start - b.start;
  });

  // Move current always first and let it appear as now
  if (currentId) {
    const currentIndex = viewEntries.findIndex((ve) => ve.id === currentId);
    // NOTE: might not always be available here
    if (currentIndex !== -1) {
      viewEntries[currentIndex].start = now - 600000;
      viewEntries.splice(0, 0, viewEntries[currentIndex]);
      viewEntries.splice(currentIndex + 1, 1);
    } else {
      debug(viewEntries);
      console.warn('View Entry for current not available');
    }
  }

  // filter out first entry if dayEnd
  if (viewEntries[0]?.type === TimelineViewEntryType.WorkdayEnd) {
    viewEntries.splice(0, 1);
  }

  // remove dayStartEnd entries if last
  let isWorkdayTypeLast = true;
  while (isWorkdayTypeLast) {
    const last = viewEntries[viewEntries.length - 1];
    if (viewEntries.length <= 2) {
      isWorkdayTypeLast = false;
    }
    if (
      last &&
      (last.type === TimelineViewEntryType.WorkdayEnd ||
        last.type === TimelineViewEntryType.WorkdayStart)
    ) {
      viewEntries.splice(viewEntries.length - 1, 1);
    } else {
      isWorkdayTypeLast = false;
    }
  }

  // filter out excess entries for start/end
  // NOTE: not pretty but works
  const cleanedUpExcessWorkDays: TimelineViewEntry[] = [];
  let prevWasSkipped = false;
  viewEntries.forEach((viewEntry, index, arr) => {
    if (prevWasSkipped) {
      prevWasSkipped = false;
      return;
    }

    if (index > 0) {
      const next = arr[index + 1];
      if (
        next &&
        viewEntry.type === TimelineViewEntryType.WorkdayStart &&
        next.type === TimelineViewEntryType.WorkdayEnd
      ) {
        prevWasSkipped = true;
        return;
      }
    }
    cleanedUpExcessWorkDays.push(viewEntry);
  });

  // debug('mapToViewEntriesE', cleanedUpExcessWorkDays, {
  //   asString: JSON.stringify(cleanedUpExcessWorkDays),
  // });

  // add day split entries

  for (let i = 0; i < cleanedUpExcessWorkDays.length; i++) {
    const entry = cleanedUpExcessWorkDays[i];
    const prev = cleanedUpExcessWorkDays[i - 1];
    if (prev && !isSameDay(entry.start, prev.start)) {
      const start = getDateTimeFromClockString('0:00', entry.start);
      cleanedUpExcessWorkDays.splice(
        cleanedUpExcessWorkDays.findIndex((innerEntry) => innerEntry === entry),
        0,
        {
          type: TimelineViewEntryType.DayCrossing,
          start,
          isHideTime: true,
          id: start.toString(),
        },
      );
      i++;
    }
  }

  // only show time for first with the time
  cleanedUpExcessWorkDays.forEach((entry, i, arr) => {
    const prev = arr[i - 1];
    if (prev && prev.start === entry.start) {
      entry.isHideTime = true;
    }
  });

  if (!isSameDay(now, cleanedUpExcessWorkDays[0].start)) {
    const start = getDateTimeFromClockString('0:00', cleanedUpExcessWorkDays[0].start);
    cleanedUpExcessWorkDays.unshift({
      type: TimelineViewEntryType.DayCrossing,
      start,
      isHideTime: true,
      id: start.toString(),
    });
  }

  return cleanedUpExcessWorkDays;
};

const isSameDay = (dt1: number, dt2: number) => {
  const d1 = new Date(dt1);
  const d2 = new Date(dt2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const createViewEntriesForBlock = (blockedBlock: BlockedBlock): TimelineViewEntry[] => {
  const viewEntriesForBock: TimelineViewEntry[] = [];
  blockedBlock.entries.forEach((entry) => {
    if (entry.type === BlockedBlockType.ScheduledTask) {
      const scheduledTask = entry.data;
      viewEntriesForBock.push({
        id: scheduledTask.id,
        start: scheduledTask.plannedAt,
        type: TimelineViewEntryType.ScheduledTask,
        data: scheduledTask,
        isHideTime: false,
      });
    } else if (entry.type === BlockedBlockType.ScheduledRepeatProjection) {
      const repeatCfg = entry.data;
      viewEntriesForBock.push({
        id: repeatCfg.id,
        start: entry.start,
        type: TimelineViewEntryType.ScheduledRepeatTaskProjection,
        data: repeatCfg,
        isHideTime: false,
      });
    } else if (entry.type === BlockedBlockType.WorkdayStartEnd) {
      // NOTE: day start and end are mixed up, because it is the opposite as the blocked range

      const workdayCfg = entry.data;
      viewEntriesForBock.push({
        id: 'DAY_END_' + entry.start,
        start: entry.start,
        type: TimelineViewEntryType.WorkdayEnd,
        data: workdayCfg,
        isHideTime: false,
      });
      viewEntriesForBock.push({
        id: 'DAY_START_' + entry.end,
        start: entry.end,
        type: TimelineViewEntryType.WorkdayStart,
        data: workdayCfg,
        isHideTime: false,
      });
    }
  });
  viewEntriesForBock.sort((a, b) => a.start - b.start);

  return viewEntriesForBock;
};

const insertBlockedBlocksViewEntries = (
  viewEntriesIn: TimelineViewEntryTask[],
  blockedBlocks: BlockedBlock[],
  now: number,
) => {
  const viewEntries: TimelineViewEntry[] = viewEntriesIn;
  let veIndex: number = 0;
  debug('################__insertBlockedBlocksViewEntries()_START__################');
  debug(blockedBlocks.length + ' BLOCKS');

  blockedBlocks.forEach((blockedBlock, blockIndex) => {
    debug(`**********BB:${blockIndex}***********`);

    const viewEntriesToAdd: TimelineViewEntry[] = createViewEntriesForBlock(blockedBlock);

    if (veIndex > viewEntries.length) {
      throw new Error('INDEX TOO LARGE');
    }
    // we don't have any tasks to split any more so we just insert
    if (veIndex === viewEntries.length) {
      debug('JUST INSERT');
      viewEntries.splice(veIndex, 0, ...viewEntriesToAdd);
      veIndex += viewEntriesToAdd.length;
    }

    for (; veIndex < viewEntries.length; ) {
      const viewEntry = viewEntries[veIndex];
      debug(`------------ve:${veIndex}-------------`);
      debug(
        {
          BIndex: blockIndex,
          BStart: moment(blockedBlock.start).format('DD/MM H:mm'),
          BEnd: moment(blockedBlock.end).format('DD/MM H:mm'),
          BTypes: blockedBlock.entries.map((v) => v.type).join(', '),
          blockedBlock,
        },
        { veIndex, veStart: moment(viewEntry.start).format('DD/MM H:mm'), viewEntry },
        { viewEntriesLength: viewEntries.length },
        {
          viewEntries,
        },
      );
      debug(viewEntry.type + ': ' + (viewEntry as any)?.data?.title);

      // block before all tasks
      // => just insert
      if (blockedBlock.end <= viewEntry.start) {
        viewEntries.splice(veIndex, 0, ...viewEntriesToAdd);
        veIndex += viewEntriesToAdd.length;
        debug('AAA');
        break;
      }
      // block starts before task and lasts until after it starts
      // => move all following
      else if (blockedBlock.start <= viewEntry.start) {
        const currentListTaskStart = viewEntry.start;
        moveEntries(viewEntries, blockedBlock.end - currentListTaskStart, veIndex);
        viewEntries.splice(veIndex, 0, ...viewEntriesToAdd);
        veIndex += viewEntriesToAdd.length;
        debug('BBB');
        break;
      } else {
        const timeLeft = getTimeLeftForViewEntry(viewEntry);
        const veEnd = viewEntry.start + getTimeLeftForViewEntry(viewEntry);
        debug(blockedBlock.start < veEnd, blockedBlock.start, veEnd);

        // NOTE: blockedBlock.start > viewEntry.start is implicated by above checks
        // if (blockedBlock.start > viewEntry.start && blockedBlock.start < veEnd) {
        if (blockedBlock.start < veEnd) {
          debug('CCC split');
          debug('SPLIT', viewEntry.type, '---', (viewEntry as any)?.data?.title);

          if (isTaskDataType(viewEntry)) {
            debug('CCC a) ' + viewEntry.type);
            const currentViewEntry: TimelineViewEntryTask = viewEntry as any;
            const splitTask: TaskWithoutReminder =
              currentViewEntry.data as TaskWithoutReminder;

            const timeLeftOnTask = timeLeft;
            const timePlannedForSplitStart = blockedBlock.start - currentViewEntry.start;
            const timePlannedForSplitContinued =
              timeLeftOnTask - timePlannedForSplitStart;

            // update type of current
            currentViewEntry.type = TimelineViewEntryType.SplitTask;

            const newSplitContinuedEntry: TimelineViewEntry = createSplitTask({
              start: blockedBlock.end,
              taskId: splitTask.id,
              timeToGo: timePlannedForSplitContinued,
              splitIndex: 0,
              title: splitTask.title,
            });

            // move entries
            const blockedBlockDuration = blockedBlock.end - blockedBlock.start;
            moveEntries(viewEntries, blockedBlockDuration, veIndex + 1);

            // insert new entries
            viewEntries.splice(veIndex, 0, ...viewEntriesToAdd, newSplitContinuedEntry);
            // NOTE: we're not including a step for the current viewEntry as it might be split again
            veIndex += viewEntriesToAdd.length;
            break;
          } else if (isContinuedTaskType(viewEntry)) {
            debug('CCC b) ' + viewEntry.type);
            const currentViewEntry: TimelineViewEntrySplitTaskContinued =
              viewEntry as any;
            const timeLeftForCompleteSplitTask = timeLeft;
            const timePlannedForSplitTaskBefore =
              blockedBlock.start - currentViewEntry.start;
            const timePlannedForSplitTaskContinued =
              timeLeftForCompleteSplitTask - timePlannedForSplitTaskBefore;

            const splitInstances = viewEntries.filter(
              (entry) =>
                (entry.type === TimelineViewEntryType.SplitTaskContinuedLast ||
                  entry.type === TimelineViewEntryType.SplitTaskContinued) &&
                entry.data.taskId === currentViewEntry.data.taskId,
            );
            // update type of current
            currentViewEntry.type = TimelineViewEntryType.SplitTaskContinued;
            currentViewEntry.data.timeToGo -= timePlannedForSplitTaskContinued;

            const splitIndex = splitInstances.length;
            const newSplitContinuedEntry: TimelineViewEntry = createSplitTask({
              start: blockedBlock.end,
              taskId: currentViewEntry.data.taskId,
              timeToGo: timePlannedForSplitTaskContinued,
              splitIndex,
              title: currentViewEntry.data.title,
            });

            // move entries
            // NOTE: needed because view entries might not be ordered at this point of time for some reason
            const blockedBlockDuration = blockedBlock.end - blockedBlock.start;
            moveAllEntriesAfterTime(
              viewEntries,
              blockedBlockDuration,
              blockedBlock.start,
            );

            // insert new entries
            viewEntries.splice(veIndex, 0, ...viewEntriesToAdd, newSplitContinuedEntry);
            // NOTE: we're not including a step for the current viewEntry as it might be split again
            veIndex += viewEntriesToAdd.length;
            break;
          } else {
            throw new Error('Invalid type given ' + viewEntry.type);
          }
        } else if (veIndex + 1 === viewEntries.length) {
          viewEntries.splice(veIndex, 0, ...viewEntriesToAdd);
          veIndex += viewEntriesToAdd.length + 1;
        } else {
          debug('DDD', veIndex, viewEntries.length);
          veIndex++;
        }
      }
    }
  });
  debug('################__insertBlockedBlocksViewEntries()_END__#################');
};

const createSplitTask = ({
  start,
  taskId,
  title,
  splitIndex,
  timeToGo,
}: {
  start: number;
  taskId: string;
  title: string;
  splitIndex: number;
  timeToGo: number;
}): TimelineViewEntrySplitTaskContinued => {
  return {
    id: `${taskId}__${splitIndex}`,
    start,
    type: TimelineViewEntryType.SplitTaskContinuedLast,
    data: {
      title,
      timeToGo,
      taskId,
      index: splitIndex,
    },
    isHideTime: false,
  };
};

const getTimeLeftForViewEntry = (viewEntry: TimelineViewEntry): number => {
  if (isTaskDataType(viewEntry)) {
    return getTimeLeftForTask((viewEntry as any).data as Task);
  } else if (isContinuedTaskType(viewEntry)) {
    return (viewEntry as TimelineViewEntrySplitTaskContinued).data.timeToGo;
    // } else if(viewEntry.type===TimelineViewEntryType.WorkdayEnd) {
    //   return viewEntry.data.
  }
  throw new Error('Wrong type given: ' + viewEntry.type);
};

const moveAllEntriesAfterTime = (
  viewEntries: TimelineViewEntry[],
  moveBy: number,
  startTime: number = 0,
) => {
  viewEntries.forEach((viewEntry: any) => {
    if (viewEntry.start >= startTime && isMoveableViewEntry(viewEntry)) {
      debug(
        'MOVE_ENTRY2',
        viewEntry.data?.title,
        moment(viewEntry.start).format('DD/MM H:mm'),
        moment(viewEntry.start + moveBy).format('DD/MM H:mm'),
      );
      viewEntry.start = viewEntry.start + moveBy;
    }
  });
};

const moveEntries = (
  viewEntries: TimelineViewEntry[],
  moveBy: number,
  startIndex: number = 0,
) => {
  for (let i = startIndex; i < viewEntries.length; i++) {
    const viewEntry: any = viewEntries[i];
    if (isMoveableViewEntry(viewEntry)) {
      debug(
        i,
        'MOVE_ENTRY',
        viewEntry.data?.title,
        moment(viewEntry.start).format('DD/MM H:mm'),
        moment(viewEntry.start + moveBy).format('DD/MM H:mm'),
      );
      viewEntry.start = viewEntry.start + moveBy;
    }
  }
};

const resortTasksWithCurrentFirst = (currentId: string, tasks: Task[]): Task[] => {
  let newTasks = tasks;
  const currentTask = tasks.find((t) => t.id === currentId);
  if (currentTask) {
    newTasks = [currentTask, ...tasks.filter((t) => t.id !== currentId)] as Task[];
  }
  return newTasks;
};

// const isTaskSplittableTaskType = (viewEntry: TimelineViewEntry): boolean => {
//   return (
//     viewEntry.type === TimelineViewEntryType.Task ||
//     viewEntry.type === TimelineViewEntryType.SplitTaskContinuedLast ||
//     viewEntry.type === TimelineViewEntryType.SplitTaskContinued
//   );
// };
//
// const isWorkStarEndType = (viewEntry: TimelineViewEntry): boolean => {
//   return (
//     viewEntry.type === TimelineViewEntryType.WorkdayStart ||
//     viewEntry.type === TimelineViewEntryType.WorkdayEnd
//   );
// };

const isTaskDataType = (viewEntry: TimelineViewEntry): boolean => {
  return (
    viewEntry.type === TimelineViewEntryType.Task ||
    viewEntry.type === TimelineViewEntryType.SplitTask ||
    viewEntry.type === TimelineViewEntryType.ScheduledTask
  );
};

const isContinuedTaskType = (viewEntry: TimelineViewEntry): boolean => {
  return (
    viewEntry.type === TimelineViewEntryType.SplitTaskContinued ||
    viewEntry.type === TimelineViewEntryType.SplitTaskContinuedLast
  );
};

const isMoveableViewEntry = (viewEntry: TimelineViewEntry): boolean => {
  return !!TIMELINE_MOVEABLE_TYPES.find(
    (moveableType) => moveableType === viewEntry.type,
  );
};
