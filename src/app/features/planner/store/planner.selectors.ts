import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromPlanner from './planner.reducer';
import { selectTaskFeatureState } from '../../tasks/store/task.selectors';
import {
  NoStartTimeRepeatProjection,
  PlannerDay,
  PlannerDayMap,
  ScheduleItemEvent,
  ScheduleItemRepeatProjection,
  ScheduleItemTask,
  ScheduleItemType,
} from '../planner.model';
import { TaskCopy, TaskPlanned, TaskWithPlannedDay } from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { selectTaskRepeatCfgsDueOnDayOnly } from '../../task-repeat-cfg/store/task-repeat-cfg.reducer';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { isSameDay } from '../../../util/is-same-day';
import { getTimeLeftForTask } from '../../../util/get-time-left-for-task';
import { ScheduleCalendarMapEntry } from '../../schedule/schedule.model';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';

export const selectPlannerState = createFeatureSelector<fromPlanner.PlannerState>(
  fromPlanner.plannerFeatureKey,
);

export const selectAllTasksWithPlannedDay = createSelector(
  selectTaskFeatureState,
  selectPlannerState,
  (taskState, plannerState): TaskWithPlannedDay[] => {
    return Object.keys(plannerState.days)
      .sort()
      .reduce<TaskWithPlannedDay[]>(
        (acc, dateStr) => [
          ...acc,
          ...plannerState.days[dateStr]
            .filter((id) => taskState.entities[id])
            .map((id) => {
              const task = taskState.entities[id] as TaskWithPlannedDay;
              return {
                ...task,
                plannedDay: dateStr,
              };
            }),
        ],
        [],
      );
  },
);
export const selectTaskIdPlannedDayMap = createSelector(
  selectPlannerState,
  (state): { [taskId: string]: string } => {
    const taskIdDayMap: { [taskId: string]: string } = {};
    Object.keys(state.days).forEach((day) => {
      state.days[day].forEach((taskId) => {
        taskIdDayMap[taskId] = day;
      });
    });
    return taskIdDayMap;
  },
);

// Updated selectAllDuePlannedDay
export const selectAllDuePlannedDay = (
  taskRepeatCfgs: TaskRepeatCfg[],
  icalEvents: ScheduleCalendarMapEntry[],
  allPlannedTasks: TaskPlanned[],
  todayStr: string,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
  return createSelector(
    selectTaskFeatureState,
    selectPlannerState,
    (taskState, plannerState): PlannerDay => {
      return getPlannerDay(
        todayStr,
        todayStr,
        taskState,
        plannerState,
        taskRepeatCfgs,
        allPlannedTasks,
        icalEvents,
        false,
      );
      // and then map all to one single day
    },
  );
};

export const selectAllDuePlannedOnDay = (
  taskRepeatCfgs: TaskRepeatCfg[],
  icalEvents: ScheduleCalendarMapEntry[],
  allPlannedTasks: TaskPlanned[],
  dayToGet: string,
  todayStr: string,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
  return createSelector(
    selectTaskFeatureState,
    selectPlannerState,
    (taskState, plannerState): PlannerDay => {
      return getPlannerDay(
        dayToGet,
        todayStr,
        taskState,
        plannerState,
        taskRepeatCfgs,
        allPlannedTasks,
        icalEvents,
        false,
      );
      // and then map all to one single day
    },
  );
};

// Updated selectPlannerDays
export const selectPlannerDays = (
  dayDates: string[],
  taskRepeatCfgs: TaskRepeatCfg[],
  todayListTaskIds: string[],
  icalEvents: ScheduleCalendarMapEntry[],
  allPlannedTasks: TaskPlanned[],
  todayStr: string,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
  const allAllPlannedIds = allPlannedTasks.map((t) => t.id);
  const unplannedTaskIdsToday = todayListTaskIds.filter(
    (id) => !allAllPlannedIds.includes(id),
  );

  return createSelector(
    selectTaskFeatureState,
    selectPlannerState,
    (taskState, plannerState): PlannerDay[] => {
      const allDatesWithData = Object.keys(plannerState.days);
      const dayDatesToUse = [
        ...dayDates,
        ...allDatesWithData
          .filter((d) => plannerState.days[d].length && !dayDates.includes(d))
          .sort((a, b) => a.localeCompare(b)),
      ];

      return dayDatesToUse.map((dayDate) =>
        getPlannerDay(
          dayDate,
          todayStr,
          taskState,
          plannerState,
          taskRepeatCfgs,
          allPlannedTasks,
          icalEvents,
          unplannedTaskIdsToday,
        ),
      );
    },
  );
};

export const selectPlannerDayMap = createSelector(
  selectTaskFeatureState,
  selectPlannerState,
  (taskState, plannerState): PlannerDayMap => {
    const map: PlannerDayMap = {};

    Object.keys(plannerState.days).forEach((dayDate) => {
      const tids = plannerState.days[dayDate] || [];
      const normalTasks = tids
        .map((id) => taskState.entities[id] as TaskCopy)
        // filter out deleted tasks
        .filter((t) => !!t);
      map[dayDate] = normalTasks;
    });

    return map;
  },
);

// Extracted common function
const getPlannerDay = (
  dayDate: string,
  todayStr: string,
  taskState: any,
  plannerState: any,
  taskRepeatCfgs: TaskRepeatCfg[],
  allPlannedTasks: TaskPlanned[],
  icalEvents: ScheduleCalendarMapEntry[],
  unplannedTaskIdsToday: string[] | false,
): PlannerDay => {
  const isToday = dayDate === todayStr;
  const currentDayDate = dateStrToUtcDate(dayDate);
  const currentDayTimestamp = currentDayDate.getTime();
  const tIds =
    isToday && unplannedTaskIdsToday
      ? unplannedTaskIdsToday
      : plannerState.days[dayDate] || [];
  const normalTasks = tIds
    .map((id) => taskState.entities[id] as TaskCopy)
    .filter((t) => !!t);

  const { repeatProjectionsForDay, noStartTimeRepeatProjections } =
    getAllRepeatableTasksForDay(taskRepeatCfgs, currentDayTimestamp);

  const scheduledTaskItems = getScheduledTaskItems(allPlannedTasks, currentDayDate);
  const icalEventsForDay = getIcalEventsForDay(icalEvents, currentDayDate);

  return {
    isToday: isToday,
    dayDate,
    timeLimit: 0,
    itemsTotal:
      normalTasks.length +
      noStartTimeRepeatProjections.length +
      repeatProjectionsForDay.length +
      scheduledTaskItems.length,
    scheduledIItems: [
      ...repeatProjectionsForDay,
      ...icalEventsForDay,
      ...scheduledTaskItems,
    ].sort((a, b) => a.start - b.start),
    tasks: normalTasks,
    noStartTimeRepeatProjections,
    timeEstimate: getAllTimeSpent(
      normalTasks,
      repeatProjectionsForDay,
      noStartTimeRepeatProjections,
      scheduledTaskItems,
    ),
  };
};

const getAllTimeSpent = (
  normalTasks: TaskCopy[],
  taskRepeatProjections: ScheduleItemRepeatProjection[],
  noStartTimeRepeatProjections: NoStartTimeRepeatProjection[],
  plannedTaskProjections: ScheduleItemTask[],
): number => {
  return (
    normalTasks.reduce((acc, t) => acc + (t.isDone ? 0 : getTimeLeftForTask(t)), 0) +
    taskRepeatProjections.reduce((acc, rp) => acc + rp.end - rp.start, 0) +
    plannedTaskProjections.reduce((acc, si) => acc + si.end - si.start, 0) +
    noStartTimeRepeatProjections.reduce(
      (acc, rp) => acc + (rp.repeatCfg.defaultEstimate || 0),
      0,
    )
  );
};

const getAllRepeatableTasksForDay = (
  taskRepeatCfgs: TaskRepeatCfg[],
  currentDayTimestamp: number,
): {
  repeatProjectionsForDay: ScheduleItemRepeatProjection[];
  noStartTimeRepeatProjections: NoStartTimeRepeatProjection[];
} => {
  const repeatProjectionsForDay: ScheduleItemRepeatProjection[] = [];
  const noStartTimeRepeatProjections: NoStartTimeRepeatProjection[] = [];
  const allRepeatableTasksForDay = selectTaskRepeatCfgsDueOnDayOnly.projector(
    taskRepeatCfgs,
    {
      dayDate: currentDayTimestamp,
    },
  );

  allRepeatableTasksForDay.forEach((repeatCfg) => {
    if (repeatCfg.startTime) {
      const start = getDateTimeFromClockString(repeatCfg.startTime, currentDayTimestamp);
      const end = start + (repeatCfg.defaultEstimate || 0);
      repeatProjectionsForDay.push({
        id: repeatCfg.id,
        type: ScheduleItemType.RepeatProjection,
        start,
        end,
        repeatCfg,
      });
    } else {
      noStartTimeRepeatProjections.push({
        id: repeatCfg.id,
        repeatCfg,
      });
    }
  });

  return {
    repeatProjectionsForDay,
    noStartTimeRepeatProjections,
  };
};

const getScheduledTaskItems = (
  allPlannedTasks: TaskPlanned[],
  currentDayDate: Date,
): ScheduleItemTask[] =>
  allPlannedTasks
    .filter((task) => isSameDay(task.plannedAt, currentDayDate))
    .map((task) => {
      const start = task.plannedAt;
      const end = start + Math.max(task.timeEstimate - task.timeSpent, 0);
      return {
        id: task.id,
        type: ScheduleItemType.Task,
        start,
        end,
        task,
      };
    });

const getIcalEventsForDay = (
  icalEvents: ScheduleCalendarMapEntry[],
  currentDayDate: Date,
): ScheduleItemEvent[] => {
  const icalEventsForDay: ScheduleItemEvent[] = [];
  icalEvents.forEach((icalMapEntry) => {
    icalMapEntry.items.forEach((calEv) => {
      const start = calEv.start;
      if (isSameDay(start, currentDayDate)) {
        const end = calEv.start + calEv.duration;
        icalEventsForDay.push({
          id: calEv.id,
          type: ScheduleItemType.CalEvent,
          start,
          end,
          calendarEvent: {
            ...calEv,
          },
        });
      }
    });
  });
  return icalEventsForDay;
};
