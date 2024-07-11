import { createActionGroup, props } from '@ngrx/store';
import { ADD_TASK_PANEL_ID } from '../week-planner.model';
import { TaskCopy } from '../../tasks/task.model';

/* eslint-disable @typescript-eslint/naming-convention */

export const WeekPlannerActions = createActionGroup({
  source: 'WeekPlanner',
  events: {
    'Upsert Week Planner Day': props<{ day: string; taskIds: string[] }>(),
    'Upsert Week Planner DayToday And Cleanup Old': props<{
      today: string;
      taskIds: string[];
    }>(),
    'Transfer Task': props<{
      task: TaskCopy;
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
