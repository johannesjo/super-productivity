import {DropPasteInput, DropPasteInputType} from '../../core/drop-paste-input/drop-paste-input';

export type BookmarkType = DropPasteInputType;

export interface BookmarkCopy extends DropPasteInput {
  id: string;
}

export type Bookmark = Readonly<BookmarkCopy>;
