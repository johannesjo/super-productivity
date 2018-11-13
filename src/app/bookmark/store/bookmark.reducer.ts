import { BookmarkActions } from './bookmark.actions';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Bookmark } from '../bookmark.model';

export interface BookmarkState extends EntityState<Bookmark> {
}

export const bookmarkAdapter: EntityAdapter<Bookmark> = createEntityAdapter<Bookmark>();


export const initialState: BookmarkState = bookmarkAdapter.getInitialState({});

export function bookmarkReducer(state = initialState, action: BookmarkActions): BookmarkState {
  switch (action.type) {

    // case BookmarkActionTypes.LoadBookmarks:
    //   return state;


    default:
      return state;
  }
}
