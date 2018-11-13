import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Bookmark } from '../bookmark.model';
import { BookmarkState } from './bookmark.reducer';

export enum BookmarkActionTypes {
  LoadBookmarkState = '[Bookmark] Load Bookmark State',
  LoadBookmarks = '[Bookmark] Load Bookmarks',
  AddBookmark = '[Bookmark] Add Bookmark',
  UpsertBookmark = '[Bookmark] Upsert Bookmark',
  AddBookmarks = '[Bookmark] Add Bookmarks',
  UpsertBookmarks = '[Bookmark] Upsert Bookmarks',
  UpdateBookmark = '[Bookmark] Update Bookmark',
  UpdateBookmarks = '[Bookmark] Update Bookmarks',
  DeleteBookmark = '[Bookmark] Delete Bookmark',
  DeleteBookmarks = '[Bookmark] Delete Bookmarks',
  ClearBookmarks = '[Bookmark] Clear Bookmarks'
}

export class LoadBookmarkState implements Action {
  readonly type = BookmarkActionTypes.LoadBookmarkState;

  constructor(public payload: { state: BookmarkState}) {
  }
}

export class LoadBookmarks implements Action {
  readonly type = BookmarkActionTypes.LoadBookmarks;

  constructor(public payload: { bookmarks: Bookmark[] }) {
  }
}

export class AddBookmark implements Action {
  readonly type = BookmarkActionTypes.AddBookmark;

  constructor(public payload: { bookmark: Bookmark }) {
  }
}

export class UpsertBookmark implements Action {
  readonly type = BookmarkActionTypes.UpsertBookmark;

  constructor(public payload: { bookmark: Bookmark }) {
  }
}

export class AddBookmarks implements Action {
  readonly type = BookmarkActionTypes.AddBookmarks;

  constructor(public payload: { bookmarks: Bookmark[] }) {
  }
}

export class UpsertBookmarks implements Action {
  readonly type = BookmarkActionTypes.UpsertBookmarks;

  constructor(public payload: { bookmarks: Bookmark[] }) {
  }
}

export class UpdateBookmark implements Action {
  readonly type = BookmarkActionTypes.UpdateBookmark;

  constructor(public payload: { bookmark: Update<Bookmark> }) {
  }
}

export class UpdateBookmarks implements Action {
  readonly type = BookmarkActionTypes.UpdateBookmarks;

  constructor(public payload: { bookmarks: Update<Bookmark>[] }) {
  }
}

export class DeleteBookmark implements Action {
  readonly type = BookmarkActionTypes.DeleteBookmark;

  constructor(public payload: { id: string }) {
  }
}

export class DeleteBookmarks implements Action {
  readonly type = BookmarkActionTypes.DeleteBookmarks;

  constructor(public payload: { ids: string[] }) {
  }
}

export class ClearBookmarks implements Action {
  readonly type = BookmarkActionTypes.ClearBookmarks;
}

export type BookmarkActions =
  LoadBookmarks
  | LoadBookmarkState
  | AddBookmark
  | UpsertBookmark
  | AddBookmarks
  | UpsertBookmarks
  | UpdateBookmark
  | UpdateBookmarks
  | DeleteBookmark
  | DeleteBookmarks
  | ClearBookmarks;
