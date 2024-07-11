import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromWeekPlanner from './week-planner.reducer';
import { selectTaskFeatureState } from '../../tasks/store/task.selectors';
import {
  NoStartTimeRepeatProjection,
  ScheduleItemEvent,
  ScheduleItemRepeatProjection,
  ScheduleItemType,
  WeekPlannerDay,
} from '../week-planner.model';
import { TaskCopy } from '../../tasks/task.model';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { TimelineCalendarMapEntry } from '../../timeline/timeline.model';
import { selectTaskRepeatCfgsDueOnDayOnly } from '../../task-repeat-cfg/store/task-repeat-cfg.reducer';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { isSameDay } from '../../../util/is-same-day';

export const selectWeekPlannerState =
  createFeatureSelector<fromWeekPlanner.WeekPlannerState>(
    fromWeekPlanner.weekPlannerFeatureKey,
  );

export const selectWeekPlannerDays = (
  dayDates: string[],
  taskRepeatCfgs: TaskRepeatCfg[],
  // TODO replace with better type
  icalEvents: TimelineCalendarMapEntry[],
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
  return createSelector(
    selectTaskFeatureState,
    selectWeekPlannerState,
    (taskState, weekPlannerState): WeekPlannerDay[] => {
      return dayDates.map((dayDate, dayIndex) => {
        const currentDayDate = new Date(dayDate);
        const currentDayTimestamp = currentDayDate.getTime();
        const tIds = weekPlannerState.days[dayDate] || [];
        const normalTasks = tIds.map((id) => taskState.entities[id] as TaskCopy);
        const icalEventsForDay: ScheduleItemEvent[] = [];
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
            const start = getDateTimeFromClockString(
              repeatCfg.startTime,
              currentDayTimestamp,
            );
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
              id: repeatCfg.id + dayIndex,
              repeatCfg,
            });
          }
        });

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
                  ico: icalMapEntry.icon,
                  ...calEv,
                },
              });
            }
          });
        });

        // TODO get all scheduled tasks the days in question

        const day: WeekPlannerDay = {
          isToday: dayIndex === 0,
          dayDate,
          timeLimit: 0,
          scheduledIItems: [...repeatProjectionsForDay, ...icalEventsForDay].sort(
            (a, b) => a.start - b.start,
          ),
          tasks: normalTasks,
          noStartTimeRepeatProjections,
          // TODO calc total time from different function
          timeEstimate: normalTasks.reduce(
            (acc, t) => acc + Math.max(t.timeEstimate - t.timeSpent, 0),
            0,
          ),
        };
        return day;
      });
    },
  );
};
