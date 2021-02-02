// Shared actions for tags and projects
import { createAction, props } from '@ngrx/store';
import { DropListModelSource } from '../../tasks/task.model';
import { WorkContextType } from '../work-context.model';

export const moveTaskInTodayList = createAction(
  '[WorkContextMeta] Move Task in Today',
  props<{
    taskId: string;
    newOrderedIds: string[];
    workContextType: WorkContextType;
    workContextId: string;
    src: DropListModelSource;
    target: DropListModelSource;
  }>(),
);
export const moveTaskUpInTodayList = createAction(
  '[WorkContextMeta] Move Task Up in Today',
  props<{ taskId: string; workContextId: string; workContextType: WorkContextType }>(),
);

export const moveTaskDownInTodayList = createAction(
  '[WorkContextMeta] Move Task Down in Today',
  props<{ taskId: string; workContextId: string; workContextType: WorkContextType }>(),
);

// PROJECT ONLY
// TODO move to project maybe
export const moveTaskUpInBacklogList = createAction(
  '[WorkContextMeta] Move Task Up in Backlog',
  props<{ taskId: string; workContextId: string }>(),
);

export const moveTaskDownInBacklogList = createAction(
  '[WorkContextMeta] Move Task Down in Backlog',
  props<{ taskId: string; workContextId: string }>(),
);

export const moveTaskInBacklogList = createAction(
  '[WorkContextMeta] Move Task in Backlog',
  props<{ taskId: string; newOrderedIds: string[]; workContextId: string }>(),
);

export const moveTaskToBacklogList = createAction(
  '[WorkContextMeta] Move Task from today to backlog',
  props<{ taskId: string; newOrderedIds: string[]; workContextId: string }>(),
);

export const moveTaskToTodayList = createAction(
  '[WorkContextMeta] Move Task from backlog to today',
  props<{
    taskId: string;
    newOrderedIds: string[];
    workContextId: string;
    src: DropListModelSource;
    target: DropListModelSource;
  }>(),
);

export const moveTaskToBacklogListAuto = createAction(
  '[WorkContextMeta] Auto Move Task from today to backlog',
  props<{ taskId: string; workContextId: string }>(),
);

export const moveTaskToTodayListAuto = createAction(
  '[WorkContextMeta] Auto Move Task from backlog to today',
  props<{ taskId: string; workContextId: string; isMoveToTop: boolean }>(),
);
