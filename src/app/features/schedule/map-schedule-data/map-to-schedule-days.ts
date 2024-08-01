import {
  Task,
  TaskPlanned,
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';

import { PlannerDayMap } from '../../planner/planner.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { getWorklogStr } from '../../../util/get-work-log-str';
import {
  getTimeLeftForTasksWithMinVal,
  getTimeLeftForTaskWithMinVal,
} from '../../../util/get-time-left-for-task';
import { msLeftToday } from '../../../util/ms-left-today';
import { selectTaskRepeatCfgsDueOnDayOnly } from '../../task-repeat-cfg/store/task-repeat-cfg.reducer';
import {
  BlockedBlock,
  BlockedBlockByDayMap,
  BlockedBlockType,
  TimelineCalendarMapEntry,
} from '../../timeline/timeline.model';
import { createSortedBlockerBlocks } from '../../timeline/map-timeline-data/create-sorted-blocker-blocks';
import {
  ScheduleDay,
  ScheduleLunchBreakCfg,
  ScheduleWorkStartEndCfg,
  SVE,
  SVERepeatProjectionSplitContinued,
  SVESplitTaskContinued,
} from '../schedule.model';
import { SCHEDULE_TASK_MIN_DURATION_IN_MS, SVEType } from '../schedule.const';
import { createViewEntriesForDay } from './create-view-entries-for-day';

export const mapToScheduleDays = (
  now: number,
  dayDates: string[],
  tasks: Task[],
  scheduledTasks: TaskPlanned[],
  scheduledTaskRepeatCfgs: TaskRepeatCfg[],
  unScheduledTaskRepeatCfgs: TaskRepeatCfg[],
  // TODO replace
  calenderWithItems: TimelineCalendarMapEntry[],
  currentId: string | null,
  plannerDayMap: PlannerDayMap,
  workStartEndCfg?: ScheduleWorkStartEndCfg,
  lunchBreakCfg?: ScheduleLunchBreakCfg,
): ScheduleDay[] => {
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
    !unScheduledTaskRepeatCfgs.length &&
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
  // console.log({ blockerBlocksDayMap });

  const v = createScheduleDays(
    nonScheduledTasks,
    unScheduledTaskRepeatCfgs,
    dayDates,
    plannerDayMap,
    blockerBlocksDayMap,
    workStartEndCfg,
    now,
  );
  // console.log(v);

  return v;
};

export const createScheduleDays = (
  nonScheduledTasks: TaskWithoutReminder[],
  unScheduledTaskRepeatCfgs: TaskRepeatCfg[],
  dayDates: string[],
  plannerDayMap: PlannerDayMap,
  blockerBlocksDayMap: BlockedBlockByDayMap,
  workStartEndCfg: ScheduleWorkStartEndCfg | undefined,
  now: number,
): ScheduleDay[] => {
  let splitTaskOrRepeatEntryForNextDay:
    | SVESplitTaskContinued
    | SVERepeatProjectionSplitContinued
    | undefined;
  let regularTasksLeftForDay: TaskWithoutReminder[] = nonScheduledTasks;
  let beyondBudgetTasks: TaskWithoutReminder[];

  const v: ScheduleDay[] = dayDates.map((dayDate, i) => {
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

    const nonScheduledRepeatCfgsDueOnDay = selectTaskRepeatCfgsDueOnDayOnly.projector(
      unScheduledTaskRepeatCfgs,
      {
        dayDate: startTime,
      },
    );
    const timeEstimatedForNonScheduledRepeatCfgs = nonScheduledRepeatCfgsDueOnDay.reduce(
      (acc, cfg) => {
        return acc + (cfg.defaultEstimate || 0);
      },
      0,
    );

    const blockerBlocksForDay = blockerBlocksDayMap[dayDate] || [];
    // const taskPlannedForDay = i > 0 ? plannerDayMap[dayDate] || [] : [];
    // TODO also add split task value
    const timeLeftForRegular =
      getTimeLeftForTasksWithMinVal(
        regularTasksLeftForDay,
        SCHEDULE_TASK_MIN_DURATION_IN_MS,
      ) +
      (splitTaskOrRepeatEntryForNextDay?.timeToGo || 0) +
      timeEstimatedForNonScheduledRepeatCfgs;
    const nonScheduledBudgetForDay = getBudgetLeftForDay(
      blockerBlocksForDay,
      i === 0 ? now : undefined,
    );

    let viewEntries: SVE[] = [];

    const timeLeftAfterRegularTasksDone = nonScheduledBudgetForDay - timeLeftForRegular;
    if (timeLeftAfterRegularTasksDone > 0) {
      // we have enough budget for ALL nonScheduled and some left for other tasks like the planned for day ones

      // console.log(
      //   'budget',
      //   'tAfter',
      //   timeLeftAfterRegularTasksDone / 60 / 60 / 1000,
      //   'bBefore',
      //   nonScheduledBudgetForDay / 60 / 60 / 1000,
      //   'tTime',
      //   timeLeftForRegular / 60 / 60 / 1000,
      // );

      // TODO this needs to include repeat projections somehow
      const { beyond, within } = getTasksWithinAndBeyondBudget(
        // TODO fix type
        (plannerDayMap[dayDate] as TaskWithoutReminder[]) || [],
        timeLeftAfterRegularTasksDone,
      );
      // console.log({ beyond, within });

      viewEntries = createViewEntriesForDay(
        startTime,
        nonScheduledRepeatCfgsDueOnDay,
        [...regularTasksLeftForDay, ...within],
        blockerBlocksForDay,
        splitTaskOrRepeatEntryForNextDay,
      );
      beyondBudgetTasks = beyond;
      regularTasksLeftForDay = [];
    } else if (nonScheduledBudgetForDay - timeLeftForRegular === 0) {
      // no splitting is needed, all tasks planed for today are OVER_BUDGET
      viewEntries = createViewEntriesForDay(
        startTime,
        nonScheduledRepeatCfgsDueOnDay,
        regularTasksLeftForDay,
        blockerBlocksForDay,
        splitTaskOrRepeatEntryForNextDay,
      );
      regularTasksLeftForDay =
        nonScheduledBudgetForDay === 0 ? regularTasksLeftForDay : [];
      beyondBudgetTasks = (plannerDayMap[dayDate] as TaskWithoutReminder[]) || [];
      // TODO
    } else {
      // we have not enough budget left  for all remaining regular tasks, so we cut them off for the next today
      // AND we sort in the tasks that were planned for today ALL as OVER_BUDGET
      viewEntries = createViewEntriesForDay(
        startTime,
        nonScheduledRepeatCfgsDueOnDay,
        regularTasksLeftForDay,
        blockerBlocksForDay,
        splitTaskOrRepeatEntryForNextDay,
      );
      regularTasksLeftForDay = getRemainingTasks(
        regularTasksLeftForDay,
        nonScheduledBudgetForDay,
      );
      beyondBudgetTasks = (plannerDayMap[dayDate] as TaskWithoutReminder[]) || [];
    }

    const viewEntriesToRenderForDay: SVE[] = [];
    splitTaskOrRepeatEntryForNextDay = undefined;
    viewEntries.forEach((entry) => {
      if (entry.start >= nextDayStart) {
        if (
          entry.type === SVEType.SplitTaskContinuedLast ||
          entry.type === SVEType.SplitTaskContinued ||
          entry.type === SVEType.RepeatProjectionSplitContinued ||
          entry.type === SVEType.RepeatProjectionSplitContinuedLast
        ) {
          if (splitTaskOrRepeatEntryForNextDay) {
            throw new Error('Schedule: More than one continued split task');
          }
          // TODO fix
          splitTaskOrRepeatEntryForNextDay = entry as any;
        }
      } else {
        if (
          entry.type === SVEType.SplitTask &&
          (entry.data as TaskWithPlannedForDayIndication).plannedForADay
        ) {
          viewEntriesToRenderForDay.push({
            ...entry,
            type: SVEType.SplitTaskPlannedForDay,
          });
        } else {
          viewEntriesToRenderForDay.push(entry);
        }
      }
    });

    // console.log({
    //   dayDate,
    //   startTime: new Date(startTime),
    //   viewEntriesForNextDay: splitTaskOrRepeatEntryForNextDay,
    //   regularTasksLeftForDay,
    //   blockerBlocksForDay,
    //   taskPlannedForDay,
    //   timeLeftForRegular,
    //   nonScheduledBudgetForDay,
    //   beyondBudgetTasks,
    //   nonScheduledBudgetForDay2: nonScheduledBudgetForDay / 60 / 60 / 1000,
    // });

    // TODO there is probably a better way to do this
    if (viewEntries[0] && viewEntries[0].type === SVEType.WorkdayEnd) {
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
      count += getTimeLeftForTaskWithMinVal(task, SCHEDULE_TASK_MIN_DURATION_IN_MS);
      return false;
    }
    return true;
  });
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
    // console.log(remainingBudget / 60 / 60 / 1000);

    const timeLeftForTask = getTimeLeftForTaskWithMinVal(
      task,
      SCHEDULE_TASK_MIN_DURATION_IN_MS,
    );
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
  console.log(remainingBudget);

  console.log(beyond);

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
  workStartEndCfg?: ScheduleWorkStartEndCfg,
  lunchBreakCfg?: ScheduleLunchBreakCfg,
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
  // console.log(allBlockedBlocks);
  console.log(
    allBlockedBlocks.filter((block) =>
      block.entries.find((e) => e.type === BlockedBlockType.ScheduledTask),
    ),
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
