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
  SVEEntryForNextDay,
} from '../schedule.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { selectTaskRepeatCfgsDueOnDayOnly } from '../../task-repeat-cfg/store/task-repeat-cfg.reducer';
import { SVEType } from '../schedule.const';
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
  let splitTaskOrRepeatEntryForNextDay: SVEEntryForNextDay | undefined;
  let flowTasksLeftAfterDay: TaskWithoutReminder[] = nonScheduledTasks;
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

    const blockerBlocksForDay = blockerBlocksDayMap[dayDate] || [];

    const nonScheduledBudgetForDay = getBudgetLeftForDay(
      blockerBlocksForDay,
      i === 0 ? now : undefined,
    );

    let viewEntries: SVE[] = [];

    const plannedForDayTasks = (plannerDayMap[dayDate] || []).map((t) => ({
      ...t,
      plannedForDay: dayDate,
    })) as TaskWithPlannedForDayIndication[];
    const flowTasksForDay = [...flowTasksLeftAfterDay, ...plannedForDayTasks];
    console.log({ flowTasksLeftAfterDay });
    console.log({ flowTasksForDay });

    const { beyond, within, isSomeTimeLeftForLastOverBudget } =
      getTasksWithinAndBeyondBudget(flowTasksForDay, nonScheduledBudgetForDay);

    const nonSplitBeyondTasks = (() => {
      if (isSomeTimeLeftForLastOverBudget) {
        const firstBeyond = beyond[0];
        if (firstBeyond) {
          within.push(firstBeyond as any);
        }
        return beyond.slice(1);
      }
      return beyond;
    })();

    console.log(isSomeTimeLeftForLastOverBudget);

    viewEntries = createViewEntriesForDay(
      dayDate,
      startTime,
      nonScheduledRepeatCfgsDueOnDay,
      within,
      blockerBlocksForDay,
      splitTaskOrRepeatEntryForNextDay,
    );
    // beyondBudgetTasks = beyond;
    beyondBudgetTasks = [];
    // TODO check if filter can be removed, when all tests are written
    flowTasksLeftAfterDay = [...nonSplitBeyondTasks];
    // flowTasksLeftAfterDay = allBeyondButFirst.filter(
    //   (task) => !viewEntries.find((e) => (e.data as any)?.id === task.id),
    // );
    console.log({
      within,
      beyond,
      nonSplitBeyondTasks,
      flowTasksLeftAfterDay,
      viewEntries,
    });

    const viewEntriesToRenderForDay: SVE[] = [];
    splitTaskOrRepeatEntryForNextDay = undefined;
    viewEntries.forEach((entry) => {
      if (entry.plannedForDay && entry.type === SVEType.Task) {
        entry.type = SVEType.TaskPlannedForDay;
      }

      if (entry.start >= nextDayStart) {
        if (
          entry.type === SVEType.Task ||
          entry.type === SVEType.SplitTask ||
          entry.type === SVEType.TaskPlannedForDay ||
          entry.type === SVEType.SplitTaskContinuedLast ||
          entry.type === SVEType.SplitTaskContinued ||
          entry.type === SVEType.RepeatProjectionSplitContinued ||
          entry.type === SVEType.RepeatProjectionSplitContinuedLast
        ) {
          if (splitTaskOrRepeatEntryForNextDay) {
            throw new Error('Schedule: More than one continued split task');
          }
          splitTaskOrRepeatEntryForNextDay = entry;
        } else {
          console.log(entry);
          console.warn('Schedule: View Entry for current not available');
        }
      } else {
        if (
          entry.type === SVEType.SplitTask &&
          (entry.data as TaskWithPlannedForDayIndication).plannedForDay
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

    console.log({
      dayDate,
      startTime: new Date(startTime),
      splitTaskOrRepeatEntryForNextDay,
      flowTasksLeftAfterDay,
      blockerBlocksForDay,
      nonScheduledBudgetForDay,
      beyondBudgetTasks,
      viewEntries,
      viewEntriesToRenderForDay,
      nonScheduledBudgetForDay2: nonScheduledBudgetForDay / 60 / 60 / 1000,
    });

    // TODO there is probably a better way to do this
    if (viewEntries[0] && viewEntries[0].type === SVEType.WorkdayEnd) {
      // remove that entry
      viewEntriesToRenderForDay.shift();
    }

    return {
      dayDate,
      entries: viewEntriesToRenderForDay,
      isToday: i === 0,
      beyondBudgetTasks: beyondBudgetTasks,
    };
  });

  console.log({ v });

  return v;
};

// const getRemainingTasks = (
//   nonScheduledTasks: TaskWithoutReminder[],
//   budget: number,
// ): TaskWithoutReminder[] => {
//   let count = 0;
//   return nonScheduledTasks.filter((task) => {
//     if (count < budget) {
//       count += getTimeLeftForTask(task);
//       return false;
//     }
//     return true;
//   });
// };

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
