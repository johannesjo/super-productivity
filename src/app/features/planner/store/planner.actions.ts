import { createActionGroup, props } from '@ngrx/store';
import { ADD_TASK_PANEL_ID } from '../planner.model';
import { TaskCopy } from '../../tasks/task.model';

/* eslint-disable @typescript-eslint/naming-convention */

export const PlannerActions = createActionGroup({
  source: 'Planner',
  events: {
    'Upsert Planner Day': props<{ day: string; taskIds: string[] }>(),
    'Cleanup Old And Undefined Planner Tasks': props<{
      today: string;
      allTaskIds: string[];
    }>(),
    'Transfer Task': props<{
      task: TaskCopy;
      prevDay: string | typeof ADD_TASK_PANEL_ID;
      newDay: string | typeof ADD_TASK_PANEL_ID;
      targetIndex: number;
      targetTaskId?: string;
      today: string;
    }>(),
    'Move In List': props<{
      targetDay: string;
      fromIndex: number;
      toIndex: number;
    }>(),
    'Move Before Task': props<{
      fromTask: TaskCopy;
      toTaskId: string;
    }>(),
    'Plan Task for Day': props<{
      task: TaskCopy;
      day: string;
      isAddToTop?: boolean;
      isShowSnack?: boolean;
    }>(),
    'Update Planner Dialog Last Shown': props<{ today: string }>(),
  },
});
