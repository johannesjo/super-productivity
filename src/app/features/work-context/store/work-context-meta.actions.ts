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
  props<{
    taskId: string;
    workContextId: string;
    doneTaskIds: string[];
    workContextType: WorkContextType;
  }>(),
);

export const moveTaskDownInTodayList = createAction(
  '[WorkContextMeta] Move Task Down in Today',
  props<{
    taskId: string;
    workContextId: string;
    doneTaskIds: string[];
    workContextType: WorkContextType;
  }>(),
);

export const moveTaskToTopInTodayList = createAction(
  '[WorkContextMeta] Move Task To Top in Today',
  props<{
    taskId: string;
    workContextId: string;
    doneTaskIds: string[];
    workContextType: WorkContextType;
  }>(),
);

export const moveTaskToBottomInTodayList = createAction(
  '[WorkContextMeta] Move Task To Bottom in Today',
  props<{
    taskId: string;
    workContextId: string;
    doneTaskIds: string[];
    workContextType: WorkContextType;
  }>(),
);
