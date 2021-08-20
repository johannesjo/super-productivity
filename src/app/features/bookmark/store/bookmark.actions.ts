import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Bookmark, BookmarkState } from '../bookmark.model';

export const loadBookmarkState = createAction(
  '[Bookmark] Load Bookmark State',
  props<{ state: BookmarkState }>(),
);

export const addBookmark = createAction(
  '[Bookmark] Add Bookmark',
  props<{ bookmark: Bookmark }>(),
);

export const updateBookmark = createAction(
  '[Bookmark] Update Bookmark',
  props<{ bookmark: Update<Bookmark> }>(),
);

export const deleteBookmark = createAction(
  '[Bookmark] Delete Bookmark',
  props<{ id: string }>(),
);

export const showBookmarks = createAction('[Bookmark] Show Bookmarks');

export const hideBookmarks = createAction('[Bookmark] Hide Bookmarks');

export const toggleBookmarks = createAction('[Bookmark] Toggle Bookmarks');

export const reorderBookmarks = createAction(
  '[Bookmark] Reorder Bookmarks',
  props<{ ids: string[] }>(),
);
