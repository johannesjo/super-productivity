import { Action } from '@ngrx/store';
import { BookmarkState } from './bookmark.reducer';

export enum BookmarkActionTypes {
  LoadBookmarksState = '[Bookmark] Load Bookmarks State'
}

export class LoadBookmarksState implements Action {
  readonly type = BookmarkActionTypes.LoadBookmarksState;

  constructor(payload: BookmarkState) {
  }
}

export type BookmarkActions = LoadBookmarksState;
