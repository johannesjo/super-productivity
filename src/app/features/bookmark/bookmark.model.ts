import {
  DropPasteInput,
  DropPasteInputType,
} from '../../core/drop-paste-input/drop-paste.model';
import { EntityState } from '@ngrx/entity';

export type BookmarkType = DropPasteInputType;

export interface BookmarkCopy extends DropPasteInput {
  id: string;
}

export type Bookmark = Readonly<BookmarkCopy>;

export interface BookmarkState extends EntityState<Bookmark> {
  // additional entities state properties
  isShowBookmarks: boolean;
}
