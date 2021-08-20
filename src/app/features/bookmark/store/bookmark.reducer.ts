import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import {
  addBookmark,
  deleteBookmark,
  hideBookmarks,
  loadBookmarkState,
  reorderBookmarks,
  showBookmarks,
  toggleBookmarks,
  updateBookmark,
} from './bookmark.actions';
import { Bookmark, BookmarkState } from '../bookmark.model';
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';

export const BOOKMARK_FEATURE_NAME = 'bookmark';

export const adapter: EntityAdapter<Bookmark> = createEntityAdapter<Bookmark>();
export const selectBookmarkFeatureState =
  createFeatureSelector<BookmarkState>(BOOKMARK_FEATURE_NAME);
export const { selectIds, selectEntities, selectAll, selectTotal } =
  adapter.getSelectors();
export const selectAllBookmarks = createSelector(selectBookmarkFeatureState, selectAll);
export const selectIsShowBookmarkBar = createSelector(
  selectBookmarkFeatureState,
  (state) => state.isShowBookmarks,
);

export const initialBookmarkState: BookmarkState = adapter.getInitialState({
  // additional entity state properties
  isShowBookmarks: false,
});

export const bookmarkReducer = createReducer<BookmarkState>(
  initialBookmarkState,

  on(loadBookmarkState, (oldState, { state }) => state),

  on(addBookmark, (state, { bookmark }) => adapter.addOne(bookmark, state)),
  on(updateBookmark, (state, { bookmark }) => adapter.updateOne(bookmark, state)),
  on(deleteBookmark, (state, { id }) => adapter.removeOne(id, state)),

  on(showBookmarks, (state) => ({ ...state, isShowBookmarks: true })),
  on(hideBookmarks, (state) => ({ ...state, isShowBookmarks: false })),
  on(toggleBookmarks, (state) => ({ ...state, isShowBookmarks: !state.isShowBookmarks })),

  on(reorderBookmarks, (state, { ids }) => {
    const oldIds = state.ids as string[];
    const newIds = ids;
    if (!oldIds || !newIds) {
      return state;
    }

    // check if we have the same values inside the arrays
    if (oldIds.slice(0).sort().join(',') === newIds.slice(0).sort().join(',')) {
      return { ...state, ids: newIds };
    } else {
      console.error('Bookmark lost while reordering. Not executing reorder');
      return state;
    }
  }),
);
