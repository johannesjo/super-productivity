export type BookmarkType = 'FILE' | 'LINK' |  'IMG' | 'COMMAND' | 'NOTE';

export type Bookmark = Readonly<{
  id: string;
  title: string;
  icon: string;
  type: BookmarkType;
  path: string;
  taskId?: string;
}>;
