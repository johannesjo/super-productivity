// META ACTIONS
import {createAction, props} from '@ngrx/store';

export const moveTaskInTodayList = createAction(
  '[WorkContext Meta] Move Task in Today',
  props<{ taskId: string; newOrderedIds: string[] }>(),
);

export const moveTaskInBacklogList = createAction(
  '[WorkContext  Meta] Move Task in Backlog',
  props<{ taskId: string; newOrderedIds: string[] }>(),
);
