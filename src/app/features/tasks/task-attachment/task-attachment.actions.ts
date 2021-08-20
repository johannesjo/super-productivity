import { Update } from '@ngrx/entity';
import { TaskAttachment } from './task-attachment.model';
import { createAction, props } from '@ngrx/store';

// NOTE: all is handled in task reducer too
export const addTaskAttachment = createAction(
  '[TaskAttachment] Add TaskAttachment',
  props<{ taskId: string; taskAttachment: TaskAttachment }>(),
);

export const updateTaskAttachment = createAction(
  '[TaskAttachment] Update TaskAttachment',
  props<{ taskId: string; taskAttachment: Update<TaskAttachment> }>(),
);

export const deleteTaskAttachment = createAction(
  '[TaskAttachment] Delete TaskAttachment',
  props<{ taskId: string; id: string }>(),
);
