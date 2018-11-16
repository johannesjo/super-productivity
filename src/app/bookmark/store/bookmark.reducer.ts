import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { BookmarkActions, BookmarkActionTypes } from './bookmark.actions';
import { Bookmark } from '../bookmark.model';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const BOOKMARK_FEATURE_NAME = 'bookmark';

export interface BookmarkState extends EntityState<Bookmark> {
  // additional entities state properties
  isShowBookmarks: boolean;
}

export const adapter: EntityAdapter<Bookmark> = createEntityAdapter<Bookmark>();
export const selectBookmarkFeatureState = createFeatureSelector<BookmarkState>(BOOKMARK_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAllBookmarks = createSelector(selectBookmarkFeatureState, selectAll);
export const selectIsShowBookmarkBar = createSelector(selectBookmarkFeatureState, state => state.isShowBookmarks);

export const initialBookmarkState: BookmarkState = adapter.getInitialState({
  // additional entity state properties
  isShowBookmarks: true
});

export function bookmarkReducer(
  state = initialBookmarkState,
  action: BookmarkActions
): BookmarkState {
  switch (action.type) {
    case BookmarkActionTypes.AddBookmark: {
      return adapter.addOne(action.payload.bookmark, state);
    }

    case BookmarkActionTypes.UpdateBookmark: {
      return adapter.updateOne(action.payload.bookmark, state);
    }

    case BookmarkActionTypes.DeleteBookmark: {
      return adapter.removeOne(action.payload.id, state);
    }

    case BookmarkActionTypes.LoadBookmarkState:
      return {...action.payload.state};

    case BookmarkActionTypes.ShowBookmarks:
      return {...state, isShowBookmarks: true};

    case BookmarkActionTypes.HideBookmarks:
      return {...state, isShowBookmarks: false};

    case BookmarkActionTypes.ToggleBookmarks:
      return {...state, isShowBookmarks: !state.isShowBookmarks};


    default: {
      return state;
    }
  }
}


