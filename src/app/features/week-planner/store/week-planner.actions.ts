import { createActionGroup, props } from '@ngrx/store';
import { ADD_TASK_PANEL_ID } from '../week-planner.model';

/* eslint-disable @typescript-eslint/naming-convention */

export const WeekPlannerActions = createActionGroup({
  source: 'WeekPlanner',
  events: {
    'Upsert Week Planner Day': props<{ day: string; taskIds: string[] }>(),
    'Upsert Week Planner DayToday': props<{ today: string; taskIds: string[] }>(),
    'Transfer Task': props<{
      tId: string;
      prevDay: string | typeof ADD_TASK_PANEL_ID;
      newDay: string | typeof ADD_TASK_PANEL_ID;
      targetIndex: number;
    }>(),
    'Move In List': props<{
      targetDay: string;
      fromIndex: number;
      toIndex: number;
    }>(),
  },
});
