import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { TaskAttachment } from './task-attachment.model';

// NOTE: all is handled in task reducer too
export enum TaskAttachmentActionTypes {
  'AddTaskAttachment' = '[TaskAttachment] Add TaskAttachment',
  'UpdateTaskAttachment' = '[TaskAttachment] Update TaskAttachment',
  'DeleteTaskAttachment' = '[TaskAttachment] Delete TaskAttachment',
}

export class AddTaskAttachment implements Action {
  readonly type: string = TaskAttachmentActionTypes.AddTaskAttachment;

  constructor(public payload: { taskId: string; taskAttachment: TaskAttachment }) {}
}

export class UpdateTaskAttachment implements Action {
  readonly type: string = TaskAttachmentActionTypes.UpdateTaskAttachment;

  constructor(
    public payload: { taskId: string; taskAttachment: Update<TaskAttachment> },
  ) {}
}

export class DeleteTaskAttachment implements Action {
  readonly type: string = TaskAttachmentActionTypes.DeleteTaskAttachment;

  constructor(public payload: { taskId: string; id: string }) {}
}

export type TaskAttachmentActions =
  | AddTaskAttachment
  | UpdateTaskAttachment
  | DeleteTaskAttachment;
