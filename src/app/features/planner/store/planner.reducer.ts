import { createFeature, createReducer, on } from '@ngrx/store';
import { PlannerActions } from './planner.actions';
import { moveItemInArray } from '../../../util/move-item-in-array';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { unique } from '../../../util/unique';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { getDbDateStr } from '../../../util/get-db-date-str';
import { Log } from '../../../core/log';

export const plannerFeatureKey = 'planner';

export interface PlannerState {
  days: {
    [dayDate: string]: string[];
  };
  addPlannedTasksDialogLastShown: string | undefined;
}

export const plannerInitialState: PlannerState = {
  days: {},
  addPlannedTasksDialogLastShown: undefined,
  // addPlannedTasksDialogLastShown: undefined,
};

export const plannerReducer = createReducer(
  plannerInitialState,

  // META ACTIONS
  // ------------
  on(loadAllData, (state, { appDataComplete }) =>
    appDataComplete.planner ? appDataComplete.planner : state,
  ),

  on(TaskSharedActions.scheduleTaskWithTime, (state, action) => {
    const daysCopy = { ...state.days };
    Object.keys(daysCopy).forEach((day) => {
      const filtered = daysCopy[day].filter((id) => id !== action.task.id);
      if (filtered.length !== daysCopy[day].length) {
        daysCopy[day] = filtered;
      }
    });
    return {
      ...state,
      days: {
        ...daysCopy,
      },
    };
  }),

  on(TaskSharedActions.unscheduleTask, (state, action) => {
    const daysCopy = { ...state.days };
    Object.keys(daysCopy).forEach((day) => {
      const filtered = daysCopy[day].filter((id) => id !== action.id);
      if (filtered.length !== daysCopy[day].length) {
        daysCopy[day] = filtered;
      }
    });
    return {
      ...state,
      days: {
        ...daysCopy,
      },
    };
  }),

  // STANDARD_ACTIONS
  // ------------

  on(PlannerActions.upsertPlannerDay, (state, action) => ({
    ...state,
    days: {
      ...state.days,
      [action.day]: action.taskIds,
    },
  })),

  on(
    PlannerActions.cleanupOldAndUndefinedPlannerTasks,
    (state, { today, allTaskIds }) => {
      const daysCopy = { ...state.days };
      const todayDate = new Date(today);
      let wasChanged = false;
      Object.keys(daysCopy).forEach((day) => {
        // NOTE: also deletes today
        if (new Date(day) <= todayDate) {
          delete daysCopy[day];
          wasChanged = true;
        }
        // remove all deleted tasks if day was not deleted
        if (!!daysCopy[day]) {
          const newDayVal = daysCopy[day].filter((id) => allTaskIds.includes(id));
          if (newDayVal.length !== daysCopy[day].length) {
            daysCopy[day] = newDayVal;
            wasChanged = true;
          }
        }
      });
      if (!wasChanged) {
        return state;
      }

      return {
        ...state,
        days: {
          ...daysCopy,
        },
      };
    },
  ),

  // NOTE: transferTask is now handled in planner-shared.reducer.ts

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

  on(PlannerActions.moveBeforeTask, (state, action) => {
    // TODO check if we can mutate less
    const daysCopy = { ...state.days };
    // filter out from other days
    let wasMutated = false;
    Object.keys(daysCopy).forEach((dayI) => {
      if (daysCopy[dayI].includes(action.fromTask.id)) {
        daysCopy[dayI] = daysCopy[dayI].filter((id) => id !== action.fromTask.id);
        wasMutated = true;
      }
      const toIndex = daysCopy[dayI].indexOf(action.toTaskId);
      if (toIndex > -1) {
        Log.log('toIndex', toIndex);
        const tidsForDay = [...daysCopy[dayI]];
        tidsForDay.splice(toIndex, 0, action.fromTask.id);
        daysCopy[dayI] = tidsForDay;
        wasMutated = true;
      }
    });
    if (!wasMutated) {
      return state;
    }

    return {
      ...state,
      days: {
        ...daysCopy,
      },
    };
  }),

  on(PlannerActions.planTaskForDay, (state, { task, day, isAddToTop }) => {
    const daysCopy = { ...state.days };
    // filter out from other days (including the target day to handle reordering)
    Object.keys(daysCopy).forEach((dayI) => {
      daysCopy[dayI] = daysCopy[dayI].filter((id) => id !== task.id);
    });

    const todayStr = getDbDateStr();
    const isPlannedForToday = day === todayStr;

    return {
      ...state,
      days: {
        ...daysCopy,
        // Only add to planner days if NOT today (today is managed by today tag)
        ...(isPlannedForToday
          ? {}
          : {
              [day]: unique(
                isAddToTop
                  ? [task.id, ...(daysCopy[day] || [])]
                  : [...(daysCopy[day] || []), task.id],
              )
                // when moving a parent to the day, remove all sub-tasks
                .filter((id) => !task.subTaskIds.includes(id)),
            }),
      },
    };
  }),

  on(PlannerActions.updatePlannerDialogLastShown, (state, { today }) => ({
    ...state,
    addPlannedTasksDialogLastShown: today,
  })),
);

export const plannerFeature = createFeature({
  name: plannerFeatureKey,
  reducer: plannerReducer,
});
