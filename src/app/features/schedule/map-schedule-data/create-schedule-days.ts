import {
  TaskWithoutReminder,
  TaskWithPlannedForDayIndication,
} from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { PlannerDayMap } from '../../planner/planner.model';
import {
  BlockedBlock,
  BlockedBlockByDayMap,
  ScheduleDay,
  ScheduleWorkStartEndCfg,
  SVE,
  SVEEntryForNextDay,
} from '../schedule.model';
import { ScheduleConfig } from '../../config/global-config.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { SCHEDULE_TASK_MIN_DURATION_IN_MS, SVEType } from '../schedule.const';
import { createViewEntriesForDay } from './create-view-entries-for-day';
import { msLeftToday } from '../../../util/ms-left-today';
import { getTasksWithinAndBeyondBudget } from './get-tasks-within-and-beyond-budget';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { selectTaskRepeatCfgsForExactDay } from '../../task-repeat-cfg/store/task-repeat-cfg.selectors';
import { Log } from '../../../core/log';

export const createScheduleDays = (
  nonScheduledTasks: TaskWithoutReminder[],
  unScheduledTaskRepeatCfgs: TaskRepeatCfg[],
  dayDates: string[],
  plannerDayMap: PlannerDayMap,
  blockerBlocksDayMap: BlockedBlockByDayMap,
  workStartEndCfg: ScheduleWorkStartEndCfg | undefined,
  now: number,
  scheduleConfig: ScheduleConfig,
): ScheduleDay[] => {
  let viewEntriesPushedToNextDay: SVEEntryForNextDay[] = [];
  let flowTasksLeftAfterDay: TaskWithoutReminder[] = nonScheduledTasks.map((task) => {
    if (task.timeEstimate === 0 && task.timeSpent === 0) {
      return {
        ...task,
        timeEstimate: SCHEDULE_TASK_MIN_DURATION_IN_MS,
      };
    }
    return task;
  });
  let beyondBudgetTasks: TaskWithoutReminder[];

  const v: ScheduleDay[] = dayDates.map((dayDate, i) => {
    const nextDayStartDate = dateStrToUtcDate(dayDate);
    nextDayStartDate.setHours(24, 0, 0, 0);
    const nextDayStart = nextDayStartDate.getTime();
    const todayStart = dateStrToUtcDate(dayDate);
    todayStart.setHours(0, 0, 0, 0);

    let startTime = i == 0 ? now : todayStart.getTime();
    if (i === 0 && startTime < todayStart.getTime()) {
      startTime = todayStart.getTime();
    }
    if (workStartEndCfg) {
      const startTimeToday = getDateTimeFromClockString(
        workStartEndCfg.startTime,
        dateStrToUtcDate(dayDate),
      );
      if (startTimeToday > now) {
        startTime = startTimeToday;
      }
    }

    const nonScheduledRepeatCfgsDueOnDay = selectTaskRepeatCfgsForExactDay.projector(
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

    const plannedForDayTasks = (plannerDayMap[dayDate] || []).map((t) => {
      return {
        ...t,
        plannedForDay: dayDate,
        ...(t.timeEstimate === 0 && t.timeSpent === 0
          ? { timeEstimate: SCHEDULE_TASK_MIN_DURATION_IN_MS }
          : {}),
      };
    }) as TaskWithPlannedForDayIndication[];
    const flowTasksForDay = [...flowTasksLeftAfterDay, ...plannedForDayTasks];
    const { beyond, within, isSomeTimeLeftForLastOverBudget } =
      getTasksWithinAndBeyondBudget(flowTasksForDay, nonScheduledBudgetForDay);

    const isUseRemainingBudgetForOverBudgetTask =
      scheduleConfig.isAllowTaskSplitting && within.length === 0;

    const nonSplitBeyondTasks = (() => {
      if (isUseRemainingBudgetForOverBudgetTask && isSomeTimeLeftForLastOverBudget) {
        const firstBeyond = beyond[0];
        if (firstBeyond) {
          within.push(firstBeyond as any);
        }
        return beyond.slice(1);
      }
      return beyond;
    })();

    // Calculate day end time for task splitting prevention
    let dayEnd = nextDayStart;
    if (workStartEndCfg) {
      const workEndTime = getDateTimeFromClockString(
        workStartEndCfg.endTime,
        dateStrToUtcDate(dayDate),
      );
      dayEnd = workEndTime;
    }

    const { viewEntries: dayViewEntries, tasksForNextDay } = createViewEntriesForDay(
      dayDate,
      startTime,
      nonScheduledRepeatCfgsDueOnDay,
      within,
      blockerBlocksForDay,
      viewEntriesPushedToNextDay,
      scheduleConfig,
      dayEnd,
    );
    viewEntries = dayViewEntries;
    // beyondBudgetTasks = beyond;
    beyondBudgetTasks = [];
    flowTasksLeftAfterDay = [...nonSplitBeyondTasks];
    if (tasksForNextDay.length) {
      flowTasksLeftAfterDay = [...flowTasksLeftAfterDay, ...tasksForNextDay];
    }

    // Handle task splitting prevention if configured
    if (!scheduleConfig.isAllowTaskSplitting) {
      // Filter out tasks that would extend beyond day boundary
      const tasksToKeep: SVE[] = [];
      const tasksToMoveToNextDay: SVE[] = [];

      viewEntries.forEach((entry) => {
        if (
          entry.type === SVEType.Task ||
          entry.type === SVEType.TaskPlannedForDay ||
          entry.type === SVEType.RepeatProjection
        ) {
          const taskEnd = entry.start + entry.duration;
          if (taskEnd > dayEnd) {
            // Task would split - move entire task to next day
            tasksToMoveToNextDay.push(entry);
          } else {
            tasksToKeep.push(entry);
          }
        } else {
          // Keep non-task entries (blocked blocks, etc.)
          tasksToKeep.push(entry);
        }
      });

      viewEntries = tasksToKeep;
      // Add tasks that need to move to the next day entries
      tasksToMoveToNextDay.forEach((task) => {
        if (
          task.type === SVEType.Task ||
          task.type === SVEType.TaskPlannedForDay ||
          task.type === SVEType.RepeatProjection
        ) {
          viewEntriesPushedToNextDay.push(task as SVEEntryForNextDay);
        }
      });
    }

    const viewEntriesToRenderForDay: SVE[] = [];
    const nextDayEntries: SVEEntryForNextDay[] = [];
    viewEntries.forEach((entry) => {
      if (entry.plannedForDay && entry.type === SVEType.Task) {
        entry.type = SVEType.TaskPlannedForDay;
      }

      if (entry.start >= nextDayStart) {
        if (
          entry.type === SVEType.Task ||
          entry.type === SVEType.SplitTask ||
          entry.type === SVEType.RepeatProjection ||
          entry.type === SVEType.TaskPlannedForDay ||
          entry.type === SVEType.SplitTaskContinuedLast ||
          entry.type === SVEType.SplitTaskContinued ||
          entry.type === SVEType.RepeatProjectionSplitContinued ||
          entry.type === SVEType.RepeatProjectionSplitContinuedLast
        ) {
          nextDayEntries.push(entry);
        } else {
          Log.log('entry Start:', new Date(entry.start), { entry });
          Log.err('Entry start time after next day start', entry);
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

    // Log.log({
    //   dayDate,
    //   startTime: dateStrToUtcDate(startTime),
    //   viewEntriesPushedToNextDay,
    //   flowTasksLeftAfterDay,
    //   blockerBlocksForDay,
    //   nonScheduledBudgetForDay,
    //   beyondBudgetTasks,
    //   viewEntries,
    //   viewEntriesToRenderForDay,
    //   nonScheduledBudgetForDay2: nonScheduledBudgetForDay / 60 / 60 / 1000,
    //   within,
    //   beyond,
    //   isSomeTimeLeftForLastOverBudget,
    // });

    viewEntriesPushedToNextDay = nextDayEntries;

    return {
      dayDate,
      entries: viewEntriesToRenderForDay,
      isToday: i === 0,
      beyondBudgetTasks: beyondBudgetTasks,
    };
  });

  return v;
};

const getBudgetLeftForDay = (
  blockerBlocksForDay: BlockedBlock[],
  nowIfToday?: number,
): number => {
  if (typeof nowIfToday === 'number') {
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
