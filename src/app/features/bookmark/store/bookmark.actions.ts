import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Bookmark } from '../bookmark.model';
import { BookmarkState } from './bookmark.reducer';

export enum BookmarkActionTypes {
  'LoadBookmarkState' = '[Bookmark] Load Bookmark State',
  'AddBookmark' = '[Bookmark] Add Bookmark',
  'UpdateBookmark' = '[Bookmark] Update Bookmark',
  'DeleteBookmark' = '[Bookmark] Delete Bookmark',

  'ShowBookmarks' = '[Bookmark] Show Bookmarks',
  'HideBookmarks' = '[Bookmark] Hide Bookmarks',
  'ToggleBookmarks' = '[Bookmark] Toggle Bookmarks',
  'ReorderBookmarks' = '[Bookmark] Reorder Bookmarks',
}

export class LoadBookmarkState implements Action {
  readonly type: string = BookmarkActionTypes.LoadBookmarkState;

  constructor(public payload: { state: BookmarkState }) {}
}

export class AddBookmark implements Action {
  readonly type: string = BookmarkActionTypes.AddBookmark;

  constructor(public payload: { bookmark: Bookmark }) {}
}

export class UpdateBookmark implements Action {
  readonly type: string = BookmarkActionTypes.UpdateBookmark;

  constructor(public payload: { bookmark: Update<Bookmark> }) {}
}

export class DeleteBookmark implements Action {
  readonly type: string = BookmarkActionTypes.DeleteBookmark;

  constructor(public payload: { id: string }) {}
}

export class ShowBookmarks implements Action {
  readonly type: string = BookmarkActionTypes.ShowBookmarks;
}

export class HideBookmarks implements Action {
  readonly type: string = BookmarkActionTypes.HideBookmarks;
}

export class ToggleBookmarks implements Action {
  readonly type: string = BookmarkActionTypes.ToggleBookmarks;
}

export class ReorderBookmarks implements Action {
  readonly type: string = BookmarkActionTypes.ReorderBookmarks;

  constructor(public payload: { ids: string[] }) {}
}

export type BookmarkActions =
  | LoadBookmarkState
  | AddBookmark
  | UpdateBookmark
  | DeleteBookmark
  | ShowBookmarks
  | HideBookmarks
  | ToggleBookmarks
  | ReorderBookmarks;
