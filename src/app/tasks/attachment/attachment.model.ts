import { DropPasteInput, DropPasteInputType } from '../../core/drop-paste-input/drop-paste-input';

export type AttachmentType = DropPasteInputType;

export interface AttachmentCopy extends DropPasteInput {
  id: string;
  taskId?: string;
  originalImgPath?: string;
}

export type Attachment = Readonly<AttachmentCopy>;
