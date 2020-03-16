import {DropPasteInput, DropPasteInputType} from '../../../core/drop-paste-input/drop-paste-input';

export type TaskAttachmentType = DropPasteInputType;

export interface TaskAttachmentCopy extends DropPasteInput {
  id: string;
  taskId?: string;
  originalImgPath?: string;
}

export type TaskAttachment = Readonly<TaskAttachmentCopy>;
