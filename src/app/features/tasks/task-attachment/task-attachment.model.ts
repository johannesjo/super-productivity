import {
  DropPasteInput,
  DropPasteInputType,
} from '../../../core/drop-paste-input/drop-paste.model';

export type TaskAttachmentType = DropPasteInputType;

export interface TaskAttachmentCopy extends DropPasteInput {
  id: string | null;
  originalImgPath?: string;
}

export type TaskAttachment = Readonly<TaskAttachmentCopy>;
