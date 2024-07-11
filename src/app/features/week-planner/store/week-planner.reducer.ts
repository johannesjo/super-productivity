import { createFeature, createReducer, on } from '@ngrx/store';
import { WeekPlannerActions } from './week-planner.actions';

export const weekPlannerFeatureKey = 'weekPlanner';

export interface WeekPlannerState {
  days: {
    [dayDate: string]: string[];
  };
}

export const initialState: WeekPlannerState = {
  days: {},
};

export const weekPlannerReducer = createReducer(
  initialState,
  on(WeekPlannerActions.upsertWeekPlannerDay, (state, action) => ({
    ...state,
    days: {
      ...state.days,
      [action.day]: action.taskIds,
    },
  })),

  on(WeekPlannerActions.upsertWeekPlannerDayToday, (state, action) => ({
    ...state,
    days: {
      ...state.days,
      [action.today]: action.taskIds,
    },
  })),

  on(WeekPlannerActions.transferTask, (state, action) => {
    const targetDays = state.days[action.newDay] || [];
    return {
      ...state,
      days: {
        ...state.days,
        [action.prevDay]: state.days[action.prevDay].filter((id) => id !== action.tId),
        [action.newDay]: [
          ...targetDays.slice(0, action.targetIndex),
          action.tId,
          ...targetDays.slice(action.targetIndex),
        ],
      },
    };
  }),
);

export const weekPlannerFeature = createFeature({
  name: weekPlannerFeatureKey,
  reducer: weekPlannerReducer,
});
