// Shared actions for tags and projects
import {createAction, props} from '@ngrx/store';
import {DropListModelSource} from '../../tasks/task.model';
import {WorkContextType} from '../work-context.model';

export const moveTaskInTodayList = createAction(
  '[WorkContext Meta] Move Task in Today',
  props<{
    taskId: string;
    newOrderedIds: string[];
    workContextType: WorkContextType;
    workContextId: string;
    src: DropListModelSource;
    target: DropListModelSource;
  }>(),
);

// TODO move to tags
export const moveTaskInBacklogList = createAction(
  '[WorkContext  Meta] Move Task in Backlog',
  props<{ taskId: string; newOrderedIds: string[] }>(),
);
