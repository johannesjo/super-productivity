export type DropPasteInputType = 'FILE' | 'LINK' | 'IMG' | 'COMMAND' | 'NOTE';

export interface DropPasteInput {
  title: string;
  type: DropPasteInputType;
  path: string;
  icon: string;
}

export enum DropPasteIcons {
  FILE = 'insert_drive_file',
  LINK = 'bookmark',
  IMG = 'image',
  COMMAND = 'laptop_windows',
  NOTE = 'note',
}
