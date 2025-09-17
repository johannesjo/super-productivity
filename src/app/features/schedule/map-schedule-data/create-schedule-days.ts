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
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { SCHEDULE_TASK_MIN_DURATION_IN_MS, SVEType } from '../schedule.const';
import { createViewEntriesForDay } from './create-view-entries-for-day';
import { msLeftToday } from '../../../util/ms-left-today';
import { getTasksWithinAndBeyondBudget } from './get-tasks-within-and-beyond-budget';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { selectTaskRepeatCfgsForExactDay } from '../../task-repeat-cfg/store/task-repeat-cfg.selectors';
import { Log } from '../../../core/log';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';

export const createScheduleDays = (
  nonScheduledTasks: TaskWithoutReminder[],
  unScheduledTaskRepeatCfgs: TaskRepeatCfg[],
  dayDates: string[],
  plannerDayMap: PlannerDayMap,
  blockerBlocksDayMap: BlockedBlockByDayMap,
  workStartEndCfg: ScheduleWorkStartEndCfg | undefined,
  now: number,
  isAutoSortByEstimateDesc?: boolean,
): ScheduleDay[] => {
  let viewEntriesPushedToNextDay: SVEEntryForNextDay[];
  let flowTasksLeftAfterDay: TaskWithoutReminder[] = nonScheduledTasks.map((task) => {
    if (task.timeEstimate === 0 && task.timeSpent === 0) {
      return {
        ...task,
        timeEstimate: SCHEDULE_TASK_MIN_DURATION_IN_MS,
      };
    }
    return task;
  });
  // Optional sorting by remaining estimate to approximate daily difficulty balancing
  if (isAutoSortByEstimateDesc) {
    flowTasksLeftAfterDay = flowTasksLeftAfterDay.sort((a, b) => {
      const aLeft = Math.max((a.timeEstimate || 0) - (a.timeSpent || 0), 0);
      const bLeft = Math.max((b.timeEstimate || 0) - (b.timeSpent || 0), 0);
      return bLeft - aLeft;
    });
  }
  let beyondBudgetTasks: TaskWithoutReminder[];

  const v: ScheduleDay[] = dayDates.map((dayDate, i) => {
    const nextDayStartDate = dateStrToUtcDate(dayDate);
    nextDayStartDate.setHours(24, 0, 0, 0);
    const nextDayStart = nextDayStartDate.getTime();
    const todayStart = dateStrToUtcDate(dayDate);
    todayStart.setHours(0, 0, 0, 0);

    let startTime = i == 0 ? now : todayStart.getTime();
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
    // merge with planned-for-day tasks
    let flowTasksForDay = [...flowTasksLeftAfterDay, ...plannedForDayTasks];

    // 保持原有任务输入顺序；仅当配置启用时，按剩余时长降序近似平衡难度
    if (isAutoSortByEstimateDesc) {
      flowTasksForDay = flowTasksForDay.sort((a, b) => {
        const aLeft = getTimeLeftForTask(a);
        const bLeft = getTimeLeftForTask(b);
        return bLeft - aLeft;
      });
    }

    const BUFFER_PER_TASK_MS = 5 * 60 * 1000;
    const { beyond, within, isSomeTimeLeftForLastOverBudget } =
      getTasksWithinAndBeyondBudget(
        flowTasksForDay,
        nonScheduledBudgetForDay,
        BUFFER_PER_TASK_MS,
      );

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

    viewEntries = createViewEntriesForDay(
      dayDate,
      startTime,
      nonScheduledRepeatCfgsDueOnDay,
      within,
      blockerBlocksForDay,
      viewEntriesPushedToNextDay,
    );
    // beyondBudgetTasks = beyond;
    beyondBudgetTasks = [];
    flowTasksLeftAfterDay = [...nonSplitBeyondTasks];

    const viewEntriesToRenderForDay: SVE[] = [];
    viewEntriesPushedToNextDay = [];
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
          viewEntriesPushedToNextDay.push(entry);
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
