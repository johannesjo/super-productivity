import {Action} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {TaskAttachment} from '../task-attachment.model';
import {TaskAttachmentState} from './attachment.reducer';

export enum AttachmentActionTypes {
  LoadAttachmentState = '[Attachment] Load Attachment State',
  AddAttachment = '[Attachment] Add Attachment',
  UpdateAttachment = '[Attachment] Update Attachment',
  DeleteAttachment = '[Attachment] Delete Attachment',
  DeleteAttachments = '[Attachment] Delete Attachments',
}

export class LoadAttachmentState implements Action {
  readonly type = AttachmentActionTypes.LoadAttachmentState;

  constructor(public payload: { state: TaskAttachmentState }) {
  }
}

export class AddAttachment implements Action {
  readonly type = AttachmentActionTypes.AddAttachment;

  constructor(public payload: { attachment: TaskAttachment }) {
  }
}

export class UpdateAttachment implements Action {
  readonly type = AttachmentActionTypes.UpdateAttachment;

  constructor(public payload: { attachment: Update<TaskAttachment> }) {
  }
}

export class DeleteAttachment implements Action {
  readonly type = AttachmentActionTypes.DeleteAttachment;

  constructor(public payload: { id: string }) {
  }
}

export class DeleteAttachments implements Action {
  readonly type = AttachmentActionTypes.DeleteAttachments;

  constructor(public payload: { ids: string[] }) {
  }
}

export type AttachmentActions =
  LoadAttachmentState
  | AddAttachment
  | UpdateAttachment
  | DeleteAttachment
  | DeleteAttachments
  ;
