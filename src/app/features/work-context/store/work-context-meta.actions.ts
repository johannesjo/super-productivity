// Shared actions for tags and projects
import {createAction, props} from '@ngrx/store';
import {DropListModelSource} from '../../tasks/task.model';
import {WorkContextType} from '../work-context.model';

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

// TODO move to tags maybe
export const moveTaskInBacklogList = createAction(
  '[WorkContextMeta] Move Task in Backlog',
  props<{ taskId: string; newOrderedIds: string[], workContextId: string }>(),
);

export const moveTaskFromTodayToBacklogList = createAction(
  '[WorkContextMeta] Move Task from today to backlog',
  props<{ taskId: string; newOrderedIds: string[], workContextId: string }>(),
);

export const moveTaskFromBacklogToTodayList = createAction(
  '[WorkContextMeta] Move Task from backlog to today',
  props<{ taskId: string; newOrderedIds: string[], workContextId: string }>(),
);
