import { createActionGroup, props } from '@ngrx/store';

/* eslint-disable @typescript-eslint/naming-convention */

export const WeekPlannerActions = createActionGroup({
  source: 'WeekPlanner',
  events: {
    'Upsert Week Planner Day': props<{ day: string; taskIds: string[] }>(),
    'Upsert Week Planner DayToday': props<{ today: string; taskIds: string[] }>(),
    'Transfer Task': props<{
      tId: string;
      prevDay: string;
      newDay: string;
      targetIndex: number;
    }>(),
  },
});
