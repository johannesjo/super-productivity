export type BookmarkType = 'FILE' | 'LINK' | 'IMG' | 'COMMAND' | 'NOTE';

export interface BookmarkCopy {
  id: string;
  title: string;
  icon: string;
  type: BookmarkType;
  path: string;
  taskId?: string;
};

export type Bookmark = Readonly<BookmarkCopy>;
