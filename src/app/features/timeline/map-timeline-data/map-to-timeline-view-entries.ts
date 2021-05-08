import { Task, TaskWithoutReminder, TaskWithReminder } from '../../tasks/task.model';
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
import * as moment from 'moment';
import {
  TIMELINE_MOVEABLE_TYPES,
  TIMELINE_VIEW_TYPE_ORDER,
  TimelineViewEntryType,
} from '../timeline.const';
import { dirtyDeepCopy } from '../../../util/dirtyDeepCopy';

export const mapToTimelineViewEntries = (
  tasks: Task[],
  scheduledTasks: TaskWithReminder[],
  currentId: string | null,
  workStartEndCfg?: TimelineWorkStartEndCfg,
  now: number = Date.now(),
): TimelineViewEntry[] => {
  let startTime = now;
  if (!tasks.length) {
    return [];
  }

  const params: any = { tasks, currentId, workStartEndCfg, now };
  console.log('mapToViewEntries', params, { asString: JSON.stringify(params) });

  if (workStartEndCfg) {
    const startTimeToday = getDateTimeFromClockString(workStartEndCfg.startTime, now);
    if (startTimeToday > now && !currentId) {
      startTime = startTimeToday;
    }
  }
  // TODO check for scheduled is current
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

  const blockedBlocks = createSortedBlockerBlocks(scheduledTasks, workStartEndCfg, now);

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
      console.log(viewEntries);
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
  const cleanedUpExcessWorkDays = viewEntries.filter((viewEntry, index, arr) => {
    if (index > 0) {
      const prev = arr[index - 1];
      const next = arr[index + 2];
      if (
        (prev.type === TimelineViewEntryType.WorkdayStart &&
          viewEntry.type === TimelineViewEntryType.WorkdayEnd) ||
        (next &&
          next.type === TimelineViewEntryType.WorkdayStart &&
          viewEntry.type === TimelineViewEntryType.WorkdayStart)
      ) {
        return false;
      }
    }
    return true;
  });

  console.log('mapToViewEntriesE', cleanedUpExcessWorkDays, {
    asString: JSON.stringify(cleanedUpExcessWorkDays),
  });
  return cleanedUpExcessWorkDays;
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
    } else if (entry.type === BlockedBlockType.WorkdayStartEnd) {
      // NOTE: day start and end are mixed up, because it is the opposite as the blocked range

      const workdayCfg = entry.data;
      viewEntriesForBock.push({
        id: 'DAY_END_' + entry.start,
        start: entry.start,
        type: TimelineViewEntryType.WorkdayEnd,
        data: workdayCfg,
        isHideTime: true,
      });
      viewEntriesForBock.push({
        id: 'DAY_START_' + entry.end,
        start: entry.end,
        type: TimelineViewEntryType.WorkdayStart,
        data: workdayCfg,
        isHideTime: true,
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
  // const viewEntriesForUnScheduled: TimelineViewEntryTask[] = viewEntriesIn.slice(0);
  const viewEntries: TimelineViewEntry[] = viewEntriesIn;
  console.log(
    viewEntries.map((viewEntry) => ({
      viewEntry,
      timeD: moment(viewEntry.start).format('H:mm'),
      durationH: getTimeLeftForTask(viewEntry.data as any) / 60000 / 60,
    })),
  );
  // console.log(blockedBlocks.map(block => ({
  //   block,
  //   startD: moment(block.start).format('H:mm'),
  //   endD: moment(block.end).format('H:mm'),
  // })));

  let veIndex: number = 0;
  console.log('############################');
  console.log(blockedBlocks.length);

  blockedBlocks.forEach((blockedBlock, blockIndex) => {
    const viewEntriesToAdd: TimelineViewEntry[] = createViewEntriesForBlock(blockedBlock);

    // we don't have any tasks to split any more so we just insert
    if (veIndex === viewEntries.length) {
      console.log('JUST INSERT');
      viewEntries.splice(veIndex, 0, ...viewEntriesToAdd);
      veIndex += viewEntriesToAdd.length;
    }

    for (; veIndex < viewEntries.length; ) {
      const viewEntry = viewEntries[veIndex];
      console.log('-----------------------------');
      console.log(
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
      console.log(viewEntry.type);

      // block before all tasks
      // => just insert
      if (blockedBlock.end <= viewEntry.start) {
        viewEntries.splice(veIndex, 0, ...viewEntriesToAdd);
        veIndex += viewEntriesToAdd.length;
        console.log('AAA');

        break;
      }
      // block starts before task and lasts until after it starts
      // => move all following
      else if (blockedBlock.start <= viewEntry.start) {
        const currentListTaskStart = viewEntry.start;
        moveEntries(viewEntries, blockedBlock.end - currentListTaskStart, veIndex);
        // console.log(viewEntries.slice(0));
        console.log(dirtyDeepCopy(viewEntries));

        viewEntries.splice(veIndex, 0, ...viewEntriesToAdd);
        console.log(dirtyDeepCopy(viewEntries));

        // console.log(viewEntries.slice(0));
        veIndex += viewEntriesToAdd.length;
        console.log('BBB');
        break;
      } else {
        const timeLeft = getTimeLeftForViewEntry(viewEntry);
        const veEnd = viewEntry.start + getTimeLeftForViewEntry(viewEntry);
        // console.log(blockedBlock.start < veEnd, blockedBlock.start, veEnd);

        // NOTE: blockedBlock.start > viewEntry.start is implicated by above checks
        // if (blockedBlock.start > viewEntry.start && blockedBlock.start < veEnd) {
        if (blockedBlock.start < veEnd) {
          console.log('CCC split');
          console.log('SPLIT', viewEntry.type, '---', (viewEntry.data as any)?.title);

          if (isTaskDataType(viewEntry)) {
            const ve: TimelineViewEntryTask = viewEntry as any;
            const splitTask: TaskWithoutReminder = ve.data as TaskWithoutReminder;
            // const timeLeftForCompleteSplitTask = getTimeLeftForTask(splitTask);
            const timeLeftForCompleteSplitTask = timeLeft;
            const timePlannedForSplitTaskBefore = blockedBlock.start - ve.start;
            const timePlannedForSplitTaskContinued =
              timeLeftForCompleteSplitTask - timePlannedForSplitTaskBefore;

            // update type
            ve.type = TimelineViewEntryType.SplitTask;

            const splitContinuedEntry: TimelineViewEntry = {
              id: `${splitTask.id}__0`,
              start: blockedBlock.end,
              type: TimelineViewEntryType.SplitTaskContinuedLast,
              data: {
                title: (splitTask as TaskWithoutReminder).title,
                timeToGo: timePlannedForSplitTaskContinued,
                taskId: splitTask.id,
                index: 0,
              },
              isHideTime: false,
            };

            const blockedBlockDuration = blockedBlock.end - blockedBlock.start;
            moveEntries(viewEntries, blockedBlockDuration, veIndex + 1);
            viewEntries.splice(veIndex, 0, ...viewEntriesToAdd, splitContinuedEntry);
            // veIndex += viewEntriesToAdd.length - 1;
            veIndex += viewEntriesToAdd.length;
            console.log('CCC a)');
            break;
          } else if (isContinuedTaskType(viewEntry)) {
            const ve: TimelineViewEntrySplitTaskContinued = viewEntry as any;
            const timeLeftForCompleteSplitTask = timeLeft;
            const timePlannedForSplitTaskBefore = blockedBlock.start - ve.start;
            const timePlannedForSplitTaskContinued =
              timeLeftForCompleteSplitTask - timePlannedForSplitTaskBefore;

            const splitInstances = viewEntries.filter(
              (entry) =>
                (entry.type === TimelineViewEntryType.SplitTaskContinuedLast ||
                  entry.type === TimelineViewEntryType.SplitTaskContinued) &&
                entry.data.taskId === ve.data.taskId,
            );
            // update type
            ve.type = TimelineViewEntryType.SplitTaskContinued;

            const splitIndex = splitInstances.length;
            const splitContinuedEntry: TimelineViewEntry = {
              id: `${ve.data.taskId}__${splitIndex}`,
              start: blockedBlock.end,
              type: TimelineViewEntryType.SplitTaskContinuedLast,
              data: {
                title: ve.data.title,
                timeToGo: timePlannedForSplitTaskContinued,
                taskId: ve.data.taskId,
                index: splitIndex,
              },
              isHideTime: false,
            };

            const blockedBlockDuration = blockedBlock.end - blockedBlock.start;
            moveEntries(viewEntries, blockedBlockDuration, veIndex + 1);
            viewEntries.splice(veIndex, 0, ...viewEntriesToAdd, splitContinuedEntry);
            // veIndex += viewEntriesToAdd.length - 1;
            veIndex += viewEntriesToAdd.length;
            console.log('CCC b)');
            break;
          } else {
            throw new Error('Invalid type given ' + viewEntry.type);
          }
        } else {
          console.log('DDD');
          veIndex++;
        }
      }
    }

    // if (blockedBlock.start <= now) {
    //   const timeToGoForBlock = blockedBlock.end - now;
    //   viewEntriesForUnScheduled.forEach((viewEntry) => {
    //     viewEntry.start = viewEntry.start + timeToGoForBlock;
    //   });
    //
    //   // add entries
    //   viewEntries.splice(viewEntries.length, 0, ...viewEntriesToAdd);
    //   return;
    // }
    //
    // const viewEntryForSplitTask:
    //   | TimelineViewEntry
    //   | undefined = viewEntriesForUnScheduled.find(
    //   (viewEntry) =>
    //     viewEntry.start !== 0 &&
    //     viewEntry.start + getTimeLeftForTask(viewEntry.data as TaskWithoutReminder) >=
    //       blockedBlock.start,
    // );
    // // console.log(blockedBlock.start);
    // // console.log(blockedBlock.end);
    // // console.log(viewEntriesForUnScheduled[0].time);
    // // console.log(viewEntriesForUnScheduled[0].time + getTimeLeftForTask(viewEntriesForUnScheduled[0].data as any));
    // // console.log(viewEntryForSplitTask);
    //
    // if (viewEntryForSplitTask) {
    //   const splitTask: TaskWithoutReminder = viewEntryForSplitTask.data as TaskWithoutReminder;
    //   const timeLeftForCompleteSplitTask = getTimeLeftForTask(splitTask);
    //
    //   const timePlannedForSplitTaskBefore =
    //     blockedBlock.start - viewEntryForSplitTask.start;
    //   const timePlannedForSplitTaskContinued =
    //     timeLeftForCompleteSplitTask - timePlannedForSplitTaskBefore;
    //   // viewEntryForSplitTask.type === TimelineViewEntryType.SplitTaskContinuedLast
    //   //   ? timeLeftForCompleteSplitTask
    //   //   : timeLeftForCompleteSplitTask - timePlannedForSplitTaskBefore;
    //
    //   // update type
    //   viewEntryForSplitTask.type = TimelineViewEntryType.SplitTask;
    //
    //   const splitInstances = viewEntries.filter(
    //     (entry) =>
    //       (entry.type === TimelineViewEntryType.SplitTaskContinuedLast ||
    //         entry.type === TimelineViewEntryType.SplitTaskContinued) &&
    //       entry.data.taskId === splitTask.id,
    //   );
    //   splitInstances.forEach(
    //     (splitInstance) =>
    //       (splitInstance.type = TimelineViewEntryType.SplitTaskContinued),
    //   );
    //
    //   const splitIndex = splitInstances.length;
    //   const splitContinuedEntry: TimelineViewEntry = {
    //     id: `${splitTask.id}__${splitIndex}`,
    //     start: blockedBlock.end,
    //     type: TimelineViewEntryType.SplitTaskContinuedLast,
    //     data: {
    //       title: (splitTask as TaskWithoutReminder).title,
    //       timeToGo: timePlannedForSplitTaskContinued,
    //       taskId: splitTask.id,
    //       index: splitIndex,
    //     },
    //     isHideTime: false,
    //   };
    //
    //   viewEntriesToAdd.push(splitContinuedEntry);
    // }
    //
    // if (viewEntryForSplitTask) {
    //   const blockedBlockDuration = blockedBlock.end - blockedBlock.start;
    //   viewEntriesForUnScheduled.forEach((viewEntry) => {
    //     if (viewEntry.start > blockedBlock.start && viewEntry !== viewEntryForSplitTask) {
    //       viewEntry.start = viewEntry.start + blockedBlockDuration;
    //     }
    //   });
    // }
    //
    // // add entries
    // viewEntries.splice(viewEntries.length, 0, ...viewEntriesToAdd);
  });
};

const getTimeLeftForViewEntry = (viewEntry: TimelineViewEntry): number => {
  if (isTaskDataType(viewEntry)) {
    return getTimeLeftForTask(viewEntry.data as Task);
  } else if (isContinuedTaskType(viewEntry)) {
    return (viewEntry as TimelineViewEntrySplitTaskContinued).data.timeToGo;
    // } else if(viewEntry.type===TimelineViewEntryType.WorkdayEnd) {
    //   return viewEntry.data.
  }
  throw new Error('Wrong type given: ' + viewEntry.type);
};

const moveEntries = (
  viewEntries: TimelineViewEntry[],
  moveBy: number,
  startIndex: number = 0,
) => {
  for (let i = startIndex; i < viewEntries.length; i++) {
    const viewEntry = viewEntries[i];
    if (isMoveableViewEntry(viewEntry)) {
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
