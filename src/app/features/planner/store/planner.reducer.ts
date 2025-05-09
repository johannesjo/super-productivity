import { createFeature, createReducer, on } from '@ngrx/store';
import { PlannerActions } from './planner.actions';
import { moveItemInArray } from '../../../util/move-item-in-array';
import { ADD_TASK_PANEL_ID, OVERDUE_LIST_ID } from '../planner.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { unique } from '../../../util/unique';
import { scheduleTaskWithTime, unScheduleTask } from '../../tasks/store/task.actions';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { planTasksForToday } from '../../tag/store/tag.actions';

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

  on(planTasksForToday, (state, action) => {
    const daysCopy = { ...state.days };
    Object.keys(daysCopy).forEach((day) => {
      const filtered = daysCopy[day].filter((id) => !action.taskIds.includes(id));
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

  on(scheduleTaskWithTime, (state, action) => {
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

  on(unScheduleTask, (state, action) => {
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

  on(PlannerActions.transferTask, (state, action) => {
    const targetDays = state.days[action.newDay] || [];

    // alert(action.prevDay);
    const updatePrevDay =
      // NOTE: it is possible that there is no data saved yet when moving from scheduled to unscheduled
      // don't update for add task panel and today list
      action.prevDay === ADD_TASK_PANEL_ID ||
      action.prevDay === OVERDUE_LIST_ID ||
      !state.days[action.prevDay] ||
      action.prevDay === action.today
        ? {}
        : {
            [action.prevDay]: state.days[action.prevDay].filter(
              (id) => id !== action.task.id,
            ),
          };

    const updateNextDay: Partial<any> =
      // don't update for add task panel and today list
      action.newDay === ADD_TASK_PANEL_ID || action.newDay === action.today
        ? {}
        : {
            [action.newDay]: unique([
              ...targetDays.slice(0, action.targetIndex),
              action.task.id,
              ...targetDays.slice(action.targetIndex),
            ])
              // when moving a parent to the day, remove all sub-tasks
              .filter((id) => !action.task.subTaskIds.includes(id)),
          };
    console.log({ updateNextDay, updatePrevDay });

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
        console.log('toIndex', toIndex);
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
    // filter out from other days
    Object.keys(daysCopy).forEach((dayI) => {
      daysCopy[dayI] = daysCopy[dayI].filter((id) => id !== task.id);
    });
    const isPlannedForToday = day === getWorklogStr();
    return {
      ...state,
      days: {
        ...daysCopy,
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
