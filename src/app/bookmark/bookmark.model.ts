export type BookmarkType = 'FILE' | 'LINK' | 'TEXT' | 'NOTE';

export type Bookmark = Readonly<{
  id: string;
  title: string;
  icon: string;
  type: BookmarkType;
  path: string;
}>;
