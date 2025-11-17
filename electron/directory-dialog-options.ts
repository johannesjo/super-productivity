import type { OpenDialogOptions } from 'electron';

export type DirectoryDialogOptions = Pick<
  OpenDialogOptions,
  'defaultPath' | 'title' | 'message' | 'buttonLabel'
>;
