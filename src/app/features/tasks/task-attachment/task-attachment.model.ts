import {
  DropPasteInput,
  DropPasteInputType,
} from '../../../core/drop-paste-input/drop-paste.model';

export type TaskAttachmentType = DropPasteInputType;

// export interface TaskAttachmentCopy extends DropPasteInput {
//   id: string | null;
//   originalImgPath?: string;
// }

export interface TaskAttachmentCopy extends Partial<DropPasteInput> {
  id: string | null;
  originalImgPath?: string;
  // made optional to make them compatible with legacy type (see above)
  // TODO properly migrate instead maybe
  type: DropPasteInputType;
  title?: string;
  icon?: string;
}

export type TaskAttachment = Readonly<TaskAttachmentCopy>;
