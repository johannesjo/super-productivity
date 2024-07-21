import {
  Task,
  TaskPlanned,
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import {
  BlockedBlock,
  BlockedBlockByDayMap,
  BlockedBlockType,
  TimelineCalendarMapEntry,
  TimelineDay,
  TimelineLunchBreakCfg,
  TimelineViewEntry,
  TimelineViewEntrySplitTaskContinued,
  TimelineViewEntryTask,
  TimelineWorkStartEndCfg,
} from '../timeline.model';
import { PlannerDayMap } from '../../planner/planner.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { createSortedBlockerBlocks } from './create-sorted-blocker-blocks';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { TIMELINE_VIEW_TYPE_ORDER, TimelineViewEntryType } from '../timeline.const';
import {
  getTimeLeftForTask,
  getTimeLeftForTasks,
} from '../../../util/get-time-left-for-task';
import { msLeftToday } from '../../../util/ms-left-today';
import { createTimelineViewEntriesForNormalTasks } from './create-timeline-view-entries-for-normal-tasks';
import { insertBlockedBlocksViewEntries } from './map-to-timeline-view-entries';

export const mapToTimelineDays = (
  dayDates: string[],
  tasks: Task[],
  scheduledTasks: TaskPlanned[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  calenderWithItems: TimelineCalendarMapEntry[],
  currentId: string | null,
  plannerDayMap: PlannerDayMap,
  workStartEndCfg?: TimelineWorkStartEndCfg,
  lunchBreakCfg?: TimelineLunchBreakCfg,
  now: number = Date.now(),
): TimelineDay[] => {
  const plannerDayKeys = Object.keys(plannerDayMap);
  const plannerDayTasks = plannerDayKeys
    .map((key) => {
      return plannerDayMap[key];
    })
    .flat();

  if (
    !tasks.length &&
    !scheduledTasks.length &&
    !scheduledTaskRepeatCfgs.length &&
    !calenderWithItems.length &&
    !plannerDayTasks.length
  ) {
    return [];
  }

  const initialTasks: Task[] = currentId
    ? resortTasksWithCurrentFirst(currentId, tasks)
    : tasks;

  const nonScheduledTasks: TaskWithoutReminder[] = initialTasks.filter(
    (task) => !(task.reminderId && task.plannedAt),
  ) as TaskWithoutReminder[];

  const blockerBlocksDayMap = createBlockedBlocksByDayMap(
    scheduledTasks,
    scheduledTaskRepeatCfgs,
    calenderWithItems,
    workStartEndCfg,
    lunchBreakCfg,
    now,
  );
  console.log({ blockerBlocksDayMap });

  const v = createTimelineDays(
    nonScheduledTasks,
    dayDates,
    plannerDayMap,
    blockerBlocksDayMap,
    workStartEndCfg,
    now,
  );
  console.log(v);

  return v;
};

export const createTimelineDays = (
  nonScheduledTasks: TaskWithoutReminder[],
  dayDates: string[],
  plannerDayMap: PlannerDayMap,
  blockerBlocksDayMap: BlockedBlockByDayMap,
  workStartEndCfg: TimelineWorkStartEndCfg | undefined,
  now: number,
): TimelineDay[] => {
  let splitTaskEntryForNextDay: TimelineViewEntrySplitTaskContinued | undefined;
  let regularTasksLeftForDay: TaskWithoutReminder[] = nonScheduledTasks;
  let beyondBudgetTasks: TaskWithoutReminder[];

  const v: TimelineDay[] = dayDates.map((dayDate, i) => {
    const nextDayStartDate = new Date(dayDate);
    nextDayStartDate.setHours(24, 0, 0, 0);
    const nextDayStart = nextDayStartDate.getTime();
    const todayStart = new Date(dayDate);
    todayStart.setHours(0, 0, 0, 0);

    // TODO can all be optimized in terms of performance
    let startTime = i == 0 ? now : todayStart.getTime();
    if (workStartEndCfg) {
      const startTimeToday = getDateTimeFromClockString(
        workStartEndCfg.startTime,
        new Date(dayDate),
      );
      if (startTimeToday > now) {
        startTime = startTimeToday;
      }
    }

    const blockerBlocksForDay = blockerBlocksDayMap[dayDate] || [];
    const taskPlannedForDay = i > 0 ? plannerDayMap[dayDate] || [] : [];
    // TODO also add split task value
    const timeLeftForRegular =
      getTimeLeftForTasks(regularTasksLeftForDay) +
      (splitTaskEntryForNextDay?.data.timeToGo || 0);
    const nonScheduledBudgetForDay = getBudgetLeftForDay(
      blockerBlocksForDay,
      i === 0 ? now : undefined,
    );

    let viewEntries: TimelineViewEntry[] = [];

    const timeLeftAfterRegularTasksDone = nonScheduledBudgetForDay - timeLeftForRegular;
    if (timeLeftAfterRegularTasksDone > 0) {
      // we have enough budget for ALL nonScheduled and some left for other tasks like the planned for day ones

      console.log(
        'budget',
        'tAfter',
        timeLeftAfterRegularTasksDone / 60 / 60 / 1000,
        'bBefore',
        nonScheduledBudgetForDay / 60 / 60 / 1000,
        'tTime',
        timeLeftForRegular / 60 / 60 / 1000,
      );

      const { beyond, within } = getTasksWithinAndBeyondBudget(
        // TODO fix type
        (plannerDayMap[dayDate] as TaskWithoutReminder[]) || [],
        timeLeftAfterRegularTasksDone,
      );
      console.log({ beyond, within });

      viewEntries = createViewEntriesForDay(
        startTime,
        [...regularTasksLeftForDay, ...within],
        blockerBlocksForDay,
        splitTaskEntryForNextDay,
      );
      beyondBudgetTasks = beyond;
      regularTasksLeftForDay = [];
    } else if (nonScheduledBudgetForDay - timeLeftForRegular === 0) {
      // no splitting is needed, all tasks planed for today are OVER_BUDGET
      regularTasksLeftForDay = [];
      beyondBudgetTasks = (plannerDayMap[dayDate] as TaskWithoutReminder[]) || [];
      // TODO
    } else {
      // we have not enough budget left  for all remaining regular tasks, so we cut them off for the next today
      // AND we sort in the tasks that were planned for today ALL as OVER_BUDGET
      viewEntries = createViewEntriesForDay(
        startTime,
        regularTasksLeftForDay,
        blockerBlocksForDay,
        splitTaskEntryForNextDay,
      );
      regularTasksLeftForDay = getRemainingTasks(
        regularTasksLeftForDay,
        nonScheduledBudgetForDay,
      );
      beyondBudgetTasks = (plannerDayMap[dayDate] as TaskWithoutReminder[]) || [];
    }

    const viewEntriesToRenderForDay: TimelineViewEntry[] = [];
    splitTaskEntryForNextDay = undefined;
    viewEntries.forEach((entry) => {
      if (entry.start >= nextDayStart) {
        if (
          entry.type === TimelineViewEntryType.SplitTaskContinuedLast ||
          entry.type === TimelineViewEntryType.SplitTaskContinued
        ) {
          if (splitTaskEntryForNextDay) {
            throw new Error('Timeline: More than one continued split task');
          }
          splitTaskEntryForNextDay = entry;
        }
      } else {
        if (
          entry.type === TimelineViewEntryType.SplitTask &&
          (entry.data as TaskWithPlannedForDayIndication).plannedForADay
        ) {
          viewEntriesToRenderForDay.push({
            ...entry,
            type: TimelineViewEntryType.SplitTaskPlannedForDay,
          });
        } else {
          viewEntriesToRenderForDay.push(entry);
        }
      }
    });

    console.log({
      dayDate,
      startTime: new Date(startTime),
      viewEntriesForNextDay: splitTaskEntryForNextDay,
      regularTasksLeftForDay,
      blockerBlocksForDay,
      taskPlannedForDay,
      timeLeftForRegular,
      nonScheduledBudgetForDay,
      beyondBudgetTasks,
      nonScheduledBudgetForDay2: nonScheduledBudgetForDay / 60 / 60 / 1000,
    });

    if (viewEntries[0] && viewEntries[0].type === TimelineViewEntryType.WorkdayEnd) {
      // remove that entry
      viewEntriesToRenderForDay.shift();
    }

    return {
      dayDate,
      entries: viewEntriesToRenderForDay,
      isToday: i === 0,
      beyondBudgetTasks: i === 0 ? [] : beyondBudgetTasks,
    };
  });
  return v;
};

const getRemainingTasks = (
  nonScheduledTasks: TaskWithoutReminder[],
  budget: number,
): TaskWithoutReminder[] => {
  let count = 0;
  return nonScheduledTasks.filter((task) => {
    if (count < budget) {
      count += getTimeLeftForTask(task);
      return false;
    }
    return true;
  });
};

export const createViewEntriesForDay = (
  startTime: number,
  nonScheduledTasksForDay: (TaskWithoutReminder | TaskWithPlannedForDayIndication)[],
  blockedBlocksForDay: BlockedBlock[],
  prevDaySplitTaskEntry?: TimelineViewEntrySplitTaskContinued,
): TimelineViewEntry[] => {
  const viewEntries: TimelineViewEntry[] = createTimelineViewEntriesForNormalTasks(
    startTime + (prevDaySplitTaskEntry?.data.timeToGo || 0),
    nonScheduledTasksForDay,
  );
  if (prevDaySplitTaskEntry) {
    viewEntries.unshift({
      ...prevDaySplitTaskEntry,
      start: startTime,
    });
  }

  insertBlockedBlocksViewEntries(
    viewEntries as TimelineViewEntryTask[],
    blockedBlocksForDay,
    0, // TODO remove form insertBlockedBlocksViewEntries
  );

  // CLEANUP
  // -------
  viewEntries.sort((a, b) => {
    if (a.start - b.start === 0) {
      return TIMELINE_VIEW_TYPE_ORDER[a.type] - TIMELINE_VIEW_TYPE_ORDER[b.type];
    }
    return a.start - b.start;
  });

  // TODO add current handling
  // Move current always first and let it appear as now
  // if (currentId) {
  //   const currentIndex = viewEntries.findIndex((ve) => ve.id === currentId);
  //   // NOTE: might not always be available here
  //   if (currentIndex !== -1) {
  //     viewEntries[currentIndex].start = now - 600000;
  //     viewEntries.splice(0, 0, viewEntries[currentIndex]);
  //     viewEntries.splice(currentIndex + 1, 1);
  //   } else {
  //     debug(viewEntries);
  //     console.warn('View Entry for current not available');
  //   }
  // }

  return viewEntries;
};

export const getTasksWithinAndBeyondBudget = (
  tasks: TaskWithoutReminder[],
  budget: number,
): {
  beyond: TaskWithoutReminder[];
  within: TaskWithPlannedForDayIndication[];
} => {
  const beyond: TaskWithoutReminder[] = [];
  const within: TaskWithPlannedForDayIndication[] = [];

  let remainingBudget = budget;
  // TODO probably can be optimized
  tasks.forEach((task) => {
    console.log(remainingBudget / 60 / 60 / 1000);

    const timeLeftForTask = getTimeLeftForTask(task);
    if (timeLeftForTask > remainingBudget) {
      beyond.push(task);
    } else {
      within.push({
        ...task,
        plannedForADay: true,
      });
      remainingBudget -= timeLeftForTask;
    }
  });

  return { beyond, within };
};

// TODO unit test
export const getBudgetLeftForDay = (
  blockerBlocksForDay: BlockedBlock[],
  nowIfToday?: number,
): number => {
  if (nowIfToday) {
    return blockerBlocksForDay.reduce((acc, currentValue) => {
      const diff =
        Math.max(nowIfToday, currentValue.end) - Math.max(nowIfToday, currentValue.start);
      return acc - diff;
    }, msLeftToday(nowIfToday));
  }

  return blockerBlocksForDay.reduce(
    (acc, currentValue) => {
      return acc - (currentValue.end - currentValue.start);
    },
    24 * 60 * 60 * 1000,
  );
};

const createBlockedBlocksByDayMap = (
  scheduledTasks: TaskPlanned[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  icalEventMap: TimelineCalendarMapEntry[],
  workStartEndCfg?: TimelineWorkStartEndCfg,
  lunchBreakCfg?: TimelineLunchBreakCfg,
  now?: number,
): BlockedBlockByDayMap => {
  const allBlockedBlocks = createSortedBlockerBlocks(
    scheduledTasks,
    scheduledTaskRepeatCfgs,
    icalEventMap,
    workStartEndCfg,
    lunchBreakCfg,
    now,
  );
  const blockedBlocksByDay: BlockedBlockByDayMap = {};
  allBlockedBlocks.forEach((block) => {
    const dayStartDate = getWorklogStr(block.start);
    const dayEndBoundary = new Date(block.start).setHours(24, 0, 0, 0);

    if (!blockedBlocksByDay[dayStartDate]) {
      blockedBlocksByDay[dayStartDate] = [];
    }
    blockedBlocksByDay[dayStartDate].push({
      ...block,
      end: Math.min(dayEndBoundary, block.end),
    });

    // TODO handle case when blocker block spans multiple days
    const dayEndDate = getWorklogStr(block.end);
    if (dayStartDate !== dayEndDate) {
      const dayStartBoundary2 = new Date(block.end).setHours(0, 0, 0, 0);
      const dayEndBoundary2 = new Date(block.end).setHours(24, 0, 0, 0);

      if (!blockedBlocksByDay[dayEndDate]) {
        blockedBlocksByDay[dayEndDate] = [];
      }
      blockedBlocksByDay[dayEndDate].push({
        ...block,
        entries: block.entries.filter((e) => e.type === BlockedBlockType.WorkdayStartEnd),
        start: dayStartBoundary2,
        end: Math.min(dayEndBoundary2, block.end),
      });
    }
  });

  return blockedBlocksByDay;
};

const resortTasksWithCurrentFirst = (currentId: string, tasks: Task[]): Task[] => {
  let newTasks = tasks;
  const currentTask = tasks.find((t) => t.id === currentId);
  if (currentTask) {
    newTasks = [currentTask, ...tasks.filter((t) => t.id !== currentId)] as Task[];
  }
  return newTasks;
};
