import { createActionGroup, props } from '@ngrx/store';
import { ADD_TASK_PANEL_ID } from '../planner.model';
import { TaskCopy } from '../../tasks/task.model';

/* eslint-disable @typescript-eslint/naming-convention */

export const PlannerActions = createActionGroup({
  source: 'Planner',
  events: {
    'Upsert Planner Day': props<{ day: string; taskIds: string[] }>(),
    'Upsert Planner DayToday And Cleanup Old And Undefined': props<{
      today: string;
      taskIdsToAdd: string[];
      allTaskStateIds: string[];
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
    'Move Before Task': props<{
      fromTask: TaskCopy;
      toTaskId: string;
    }>(),
    'Remove Task From Days': props<{
      taskId: string;
    }>(),
    'Plan Task for Day': props<{ task: TaskCopy; day: string; isAddToTop?: boolean }>(),
    'Update Planner Dialog Last Shown': props<{ today: string }>(),
  },
});
