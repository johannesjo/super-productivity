import { createFeature, createReducer, on } from '@ngrx/store';
import { WeekPlannerActions } from './week-planner.actions';
import { moveItemInArray } from '../../../util/move-item-in-array';
import { ADD_TASK_PANEL_ID } from '../week-planner.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';

export const weekPlannerFeatureKey = 'weekPlanner';

export interface WeekPlannerState {
  days: {
    [dayDate: string]: string[];
  };
}

export const weekPlannerInitialState: WeekPlannerState = {
  days: {},
};

export const weekPlannerReducer = createReducer(
  weekPlannerInitialState,

  // META ACTIONS
  // ------------
  on(loadAllData, (state, { appDataComplete }) =>
    appDataComplete.weekPlanner ? appDataComplete.weekPlanner : state,
  ),

  // STANDARD_ACTIONS
  // ------------

  on(WeekPlannerActions.upsertWeekPlannerDay, (state, action) => ({
    ...state,
    days: {
      ...state.days,
      [action.day]: action.taskIds,
    },
  })),

  on(WeekPlannerActions.upsertWeekPlannerDayTodayAndCleanupOld, (state, action) => {
    return {
      ...state,
      days: {
        ...state.days,
        [action.today]: action.taskIds,
      },
    };
  }),

  on(WeekPlannerActions.transferTask, (state, action) => {
    const targetDays = state.days[action.newDay] || [];
    console.log(action.prevDay);

    const updatePrevDay =
      action.prevDay === ADD_TASK_PANEL_ID
        ? {}
        : {
            [action.prevDay]: state.days[action.prevDay].filter(
              (id) => id !== action.tId,
            ),
          };

    const updateNextDay: Partial<any> =
      action.newDay === ADD_TASK_PANEL_ID
        ? {}
        : {
            [action.newDay]: [
              ...targetDays.slice(0, action.targetIndex),
              action.tId,
              ...targetDays.slice(action.targetIndex),
            ],
          };

    if (action.newDay !== ADD_TASK_PANEL_ID) {
      return {
        ...state,
        days: {
          ...state.days,
          ...updatePrevDay,
          ...updateNextDay,
        },
      };
    }

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

  on(WeekPlannerActions.moveInList, (state, action) => {
    const targetDays = state.days[action.targetDay] || [];
    return {
      ...state,
      days: {
        ...state.days,
        [action.targetDay]: moveItemInArray(targetDays, action.fromIndex, action.toIndex),
      },
    };
  }),
);

export const weekPlannerFeature = createFeature({
  name: weekPlannerFeatureKey,
  reducer: weekPlannerReducer,
});
