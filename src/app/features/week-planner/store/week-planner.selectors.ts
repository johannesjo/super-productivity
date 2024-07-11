import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromWeekPlanner from './week-planner.reducer';
import { selectTaskFeatureState } from '../../tasks/store/task.selectors';
import { WeekPlannerDay } from '../week-planner.model';
import { TaskCopy } from '../../tasks/task.model';

export const selectWeekPlannerState =
  createFeatureSelector<fromWeekPlanner.WeekPlannerState>(
    fromWeekPlanner.weekPlannerFeatureKey,
  );

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const selectWeekPlannerDays = (dayDates: string[]) => {
  return createSelector(
    selectTaskFeatureState,
    selectWeekPlannerState,
    (taskState, weekPlannerState): WeekPlannerDay[] => {
      return dayDates.map((dayDate, index) => {
        const tIds = weekPlannerState.days[dayDate] || [];
        const normalTasks = tIds.map((id) => taskState.entities[id] as TaskCopy);
        const day: WeekPlannerDay = {
          isToday: index === 0,
          dayDate,
          timeLimit: 0,
          scheduledIItems: [],
          tasks: normalTasks,
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
