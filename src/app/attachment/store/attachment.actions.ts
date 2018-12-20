import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Attachment } from '../attachment.model';
import { AttachmentState } from './attachment.reducer';

export enum AttachmentActionTypes {
  LoadAttachmentState = '[Attachment] Load Attachment State',
  AddAttachment = '[Attachment] Add Attachment',
  UpdateAttachment = '[Attachment] Update Attachment',
  DeleteAttachment = '[Attachment] Delete Attachment',
}

export class LoadAttachmentState implements Action {
  readonly type = AttachmentActionTypes.LoadAttachmentState;

  constructor(public payload: { state: AttachmentState }) {
  }
}

export class AddAttachment implements Action {
  readonly type = AttachmentActionTypes.AddAttachment;

  constructor(public payload: { attachment: Attachment }) {
  }
}

export class UpdateAttachment implements Action {
  readonly type = AttachmentActionTypes.UpdateAttachment;

  constructor(public payload: { attachment: Update<Attachment> }) {
  }
}

export class DeleteAttachment implements Action {
  readonly type = AttachmentActionTypes.DeleteAttachment;

  constructor(public payload: { id: string }) {
  }
}

export type AttachmentActions =
  LoadAttachmentState
  | AddAttachment
  | UpdateAttachment
  | DeleteAttachment
  ;
