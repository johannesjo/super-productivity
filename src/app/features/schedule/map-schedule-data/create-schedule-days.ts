import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { PlannerDayMap } from '../../planner/planner.model';
import { BlockedBlock, BlockedBlockByDayMap } from '../../timeline/timeline.model';
import {
  ScheduleDay,
  ScheduleWorkStartEndCfg,
  SVE,
  SVERepeatProjectionSplitContinued,
  SVESplitTaskContinued,
} from '../schedule.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { selectTaskRepeatCfgsDueOnDayOnly } from '../../task-repeat-cfg/store/task-repeat-cfg.reducer';
import {
  getTimeLeftForTasksWithMinVal,
  getTimeLeftForTaskWithMinVal,
} from '../../../util/get-time-left-for-task';
import { SCHEDULE_TASK_MIN_DURATION_IN_MS, SVEType } from '../schedule.const';
import { createViewEntriesForDay } from './create-view-entries-for-day';
import { msLeftToday } from '../../../util/ms-left-today';
import { getTasksWithinAndBeyondBudget } from './get-tasks-within-and-beyond-budget';

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
      (splitTaskOrRepeatEntryForNextDay?.duration || 0) +
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

// TODO unit test
const getBudgetLeftForDay = (
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
