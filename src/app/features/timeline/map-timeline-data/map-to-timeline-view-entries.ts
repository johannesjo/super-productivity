import { Task, TaskWithoutReminder, TaskWithReminder } from '../../tasks/task.model';
import {
  BlockedBlock,
  BlockedBlockType,
  TimelineViewEntry,
  TimelineViewEntryType,
  TimelineWorkStartEndCfg,
} from '../timeline.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { createSortedBlockerBlocks } from './create-sorted-blocker-blocks';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { createTimelineViewEntriesForNormalTasks } from './create-timeline-view-entries-for-normal-tasks';
import * as moment from 'moment';

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

  const viewEntries = createTimelineViewEntriesForNormalTasks(
    startTime,
    nonScheduledTasks,
  );

  const blockedBlocks = createSortedBlockerBlocks(scheduledTasks, workStartEndCfg, now);

  insertBlockedBlocksViewEntries(viewEntries, blockedBlocks, now);

  // CLEANUP
  // -------
  viewEntries.sort((a, b) => {
    if (a.time - b.time === 0) {
      switch (a.type) {
        case TimelineViewEntryType.WorkdayEnd:
          return 1;
        case TimelineViewEntryType.WorkdayStart:
          return -1;
      }
    }
    return a.time - b.time;
  });

  // Move current always first and let it appear as now
  if (currentId) {
    const currentIndex = viewEntries.findIndex((ve) => ve.id === currentId);
    // NOTE: might not always be available here
    if (currentIndex !== -1) {
      viewEntries[currentIndex].time = now - 600000;
      viewEntries.splice(0, 0, viewEntries[currentIndex]);
      viewEntries.splice(currentIndex + 1, 1);
    } else {
      console.log(viewEntries);
      console.warn('View Entry for current not available');
    }
  }

  if (viewEntries[0]?.type === TimelineViewEntryType.WorkdayEnd) {
    viewEntries.splice(0, 1);
  }

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

  // console.log('mapToViewEntriesE', viewEntries, {asString: JSON.stringify(viewEntries)});
  // filter out double entries for start/end
  return viewEntries.filter((viewEntry, index, arr) => {
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
};

const createViewEntriesForBlock = (blockedBlock: BlockedBlock): TimelineViewEntry[] => {
  const viewEntriesForBock: TimelineViewEntry[] = [];
  blockedBlock.entries.forEach((entry) => {
    if (entry.type === BlockedBlockType.ScheduledTask) {
      const scheduledTask = entry.data;
      viewEntriesForBock.push({
        id: scheduledTask.id,
        time: scheduledTask.plannedAt,
        type: TimelineViewEntryType.ScheduledTask,
        data: scheduledTask,
        isHideTime: false,
      });
    } else if (entry.type === BlockedBlockType.WorkdayStartEnd) {
      // NOTE: day start and end are mixed up, because it is the opposite as the blocked range

      const workdayCfg = entry.data;
      viewEntriesForBock.push({
        id: 'DAY_END_' + entry.start,
        time: entry.start,
        type: TimelineViewEntryType.WorkdayEnd,
        data: workdayCfg,
        isHideTime: true,
        isHideDate: true,
      });
      viewEntriesForBock.push({
        id: 'DAY_START_' + entry.end,
        time: entry.end,
        type: TimelineViewEntryType.WorkdayStart,
        data: workdayCfg,
        isHideTime: true,
        isHideDate: true,
      });
    }
  });
  viewEntriesForBock.sort((a, b) => a.time - b.time);

  return viewEntriesForBock;
};

const insertBlockedBlocksViewEntries = (
  viewEntries: TimelineViewEntry[],
  blockedBlocks: BlockedBlock[],
  now: number,
) => {
  if (!blockedBlocks.length) {
    return;
  }
  const viewEntriesForUnScheduled = viewEntries.slice(0);

  console.log(
    viewEntries.map((viewEntry) => ({
      viewEntry,
      timeD: moment(viewEntry.time).format('H:mm'),
      durationH: getTimeLeftForTask(viewEntry.data as any) / 60000 / 60,
    })),
  );
  // console.log(blockedBlocks.map(block => ({
  //   block,
  //   startD: moment(block.start).format('H:mm'),
  //   endD: moment(block.end).format('H:mm'),
  // })));

  blockedBlocks.forEach((blockedBlock, i) => {
    const viewEntriesToAdd: TimelineViewEntry[] = createViewEntriesForBlock(blockedBlock);
    if (blockedBlock.start <= now) {
      const timeToGoForBlock = blockedBlock.end - now;
      viewEntriesForUnScheduled.forEach((viewEntry) => {
        viewEntry.time = viewEntry.time + timeToGoForBlock;
      });

      // add entries
      viewEntries.splice(viewEntries.length, 0, ...viewEntriesToAdd);
      return;
    }

    const viewEntryForSplitTask:
      | TimelineViewEntry
      | undefined = viewEntriesForUnScheduled.find(
      (viewEntry) =>
        viewEntry.time !== 0 &&
        viewEntry.time + getTimeLeftForTask(viewEntry.data as TaskWithoutReminder) >=
          blockedBlock.start,
    );
    // console.log(blockedBlock.start);
    // console.log(blockedBlock.end);
    // console.log(viewEntriesForUnScheduled[0].time);
    // console.log(viewEntriesForUnScheduled[0].time + getTimeLeftForTask(viewEntriesForUnScheduled[0].data as any));
    // console.log(viewEntryForSplitTask);

    if (viewEntryForSplitTask) {
      const splitTask: TaskWithoutReminder = viewEntryForSplitTask.data as TaskWithoutReminder;
      const timeLeftForCompleteSplitTask = getTimeLeftForTask(splitTask);

      const timePlannedForSplitTaskBefore =
        blockedBlock.start - viewEntryForSplitTask.time;
      const timePlannedForSplitTaskContinued =
        viewEntryForSplitTask.type === TimelineViewEntryType.SplitTaskContinuedLast
          ? timeLeftForCompleteSplitTask
          : timeLeftForCompleteSplitTask - timePlannedForSplitTaskBefore;

      // update type
      viewEntryForSplitTask.type = TimelineViewEntryType.SplitTask;

      const splitInstances = viewEntries.filter(
        (entry) =>
          (entry.type === TimelineViewEntryType.SplitTaskContinuedLast ||
            entry.type === TimelineViewEntryType.SplitTaskContinued) &&
          entry.data.taskId === splitTask.id,
      );
      splitInstances.forEach(
        (splitInstance) =>
          (splitInstance.type = TimelineViewEntryType.SplitTaskContinued),
      );

      const splitIndex = splitInstances.length;
      const splitContinuedEntry: TimelineViewEntry = {
        id: `${splitTask.id}__${splitIndex}`,
        time: blockedBlock.end,
        type: TimelineViewEntryType.SplitTaskContinuedLast,
        data: {
          title: (splitTask as TaskWithoutReminder).title,
          timeToGo: timePlannedForSplitTaskContinued,
          taskId: splitTask.id,
          index: splitIndex,
        },
        isHideTime: false,
      };

      viewEntriesToAdd.push(splitContinuedEntry);
    }

    if (viewEntryForSplitTask) {
      const blockedBlockDuration = blockedBlock.end - blockedBlock.start;
      viewEntriesForUnScheduled.forEach((viewEntry) => {
        if (viewEntry.time > blockedBlock.start && viewEntry !== viewEntryForSplitTask) {
          viewEntry.time = viewEntry.time + blockedBlockDuration;
        }
      });
    }

    // add entries
    viewEntries.splice(viewEntries.length, 0, ...viewEntriesToAdd);
  });
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
//   return viewEntry.type === TimelineViewEntryType.Task || viewEntry.type === TimelineViewEntryType.SplitTaskContinued;
// };
