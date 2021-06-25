import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import {
  AddBookmark,
  BookmarkActions,
  BookmarkActionTypes,
  DeleteBookmark,
  LoadBookmarkState,
  ReorderBookmarks,
  UpdateBookmark,
} from './bookmark.actions';
import { Bookmark } from '../bookmark.model';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const BOOKMARK_FEATURE_NAME = 'bookmark';

export interface BookmarkState extends EntityState<Bookmark> {
  // additional entities state properties
  isShowBookmarks: boolean;
}

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

export const bookmarkReducer = (
  state: BookmarkState = initialBookmarkState,
  action: BookmarkActions,
): BookmarkState => {
  switch (action.type) {
    case BookmarkActionTypes.AddBookmark: {
      return adapter.addOne((action as AddBookmark).payload.bookmark, state);
    }

    case BookmarkActionTypes.UpdateBookmark: {
      return adapter.updateOne((action as UpdateBookmark).payload.bookmark, state);
    }

    case BookmarkActionTypes.DeleteBookmark: {
      return adapter.removeOne((action as DeleteBookmark).payload.id, state);
    }

    case BookmarkActionTypes.LoadBookmarkState:
      return { ...(action as LoadBookmarkState).payload.state };

    case BookmarkActionTypes.ShowBookmarks:
      return { ...state, isShowBookmarks: true };

    case BookmarkActionTypes.HideBookmarks:
      return { ...state, isShowBookmarks: false };

    case BookmarkActionTypes.ToggleBookmarks:
      return { ...state, isShowBookmarks: !state.isShowBookmarks };

    case BookmarkActionTypes.ReorderBookmarks: {
      const oldIds = state.ids as string[];
      const newIds = (action as ReorderBookmarks).payload.ids as string[];
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
    }

    default: {
      return state;
    }
  }
};
