import { createFeature, createReducer, on } from '@ngrx/store';
import { PlannerActions } from './planner.actions';
import { moveItemInArray } from '../../../util/move-item-in-array';
import { ADD_TASK_PANEL_ID } from '../planner.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { unique } from '../../../util/unique';

export const plannerFeatureKey = 'planner';

export interface PlannerState {
  days: {
    [dayDate: string]: string[];
  };
}

export const plannerInitialState: PlannerState = {
  days: {},
};

export const plannerReducer = createReducer(
  plannerInitialState,

  // META ACTIONS
  // ------------
  on(loadAllData, (state, { appDataComplete }) =>
    appDataComplete.planner ? appDataComplete.planner : state,
  ),

  // STANDARD_ACTIONS
  // ------------

  on(PlannerActions.upsertPlannerDay, (state, action) => ({
    ...state,
    days: {
      ...state.days,
      [action.day]: action.taskIds,
    },
  })),

  on(PlannerActions.removeTaskFromDays, (state, action) => {
    const daysCopy = { ...state.days };
    Object.keys(daysCopy).forEach((day) => {
      daysCopy[day] = daysCopy[day]
        // remove all ids that are in the new day and remove all deleted or missing
        .filter((id) => id !== action.taskId);
    });
    return {
      days: {
        ...daysCopy,
      },
    };
  }),

  on(
    PlannerActions.upsertPlannerDayTodayAndCleanupOldAndUndefined,
    (state, { today, taskIdsToAdd, allTaskStateIds }) => {
      const daysCopy = { ...state.days };
      Object.keys(daysCopy).forEach((day) => {
        if (new Date(day) < new Date(today)) {
          delete daysCopy[day];
        } else {
          daysCopy[day] = daysCopy[day]
            // remove all ids that are in the new day and remove all deleted or missing
            .filter((id) => !taskIdsToAdd.includes(id) && allTaskStateIds.includes(id));
        }
      });
      return {
        days: {
          ...daysCopy,
          [today]: taskIdsToAdd,
        },
      };
    },
  ),

  on(PlannerActions.transferTask, (state, action) => {
    const targetDays = state.days[action.newDay] || [];

    const updatePrevDay =
      // NOTE: it is possible that there is no data saved yet when moving from scheduled to unscheduled
      action.prevDay === ADD_TASK_PANEL_ID || !state.days[action.prevDay]
        ? {}
        : {
            [action.prevDay]: state.days[action.prevDay].filter(
              (id) => id !== action.task.id,
            ),
          };

    const updateNextDay: Partial<any> =
      action.newDay === ADD_TASK_PANEL_ID
        ? {}
        : {
            [action.newDay]: unique([
              ...targetDays.slice(0, action.targetIndex),
              action.task.id,
              ...targetDays.slice(action.targetIndex),
            ]),
          };

    return {
      ...state,
      days: {
        ...state.days,
        ...updatePrevDay,
        ...updateNextDay,
      },
    };
  }),

  on(PlannerActions.moveInList, (state, action) => {
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

export const plannerFeature = createFeature({
  name: plannerFeatureKey,
  reducer: plannerReducer,
});
