import {
  hideAddTaskBar,
  hideNotes,
  hideSearchBar,
  hideSideNav,
  showAddTaskBar,
  showSearchBar,
  toggleAddTaskBar,
  toggleSearchBar,
  toggleShowNotes,
  toggleSideNav,
} from './layout.actions';
import {
  Action,
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
} from '@ngrx/store';

export const LAYOUT_FEATURE_NAME = 'layout';

export interface LayoutState {
  isShowAddTaskBar: boolean;
  isShowBookmarkBar: boolean;
  isShowNotes: boolean;
  isShowSearchBar: boolean;
  isShowSideNav: boolean;
}

const _initialLayoutState: LayoutState = {
  isShowAddTaskBar: false,
  isShowBookmarkBar: false,
  isShowSideNav: false,
  isShowSearchBar: false,
  isShowNotes: false,
};

export const selectLayoutFeatureState =
  createFeatureSelector<LayoutState>(LAYOUT_FEATURE_NAME);

export const selectIsShowAddTaskBar = createSelector(
  selectLayoutFeatureState,
  (state) => state.isShowAddTaskBar,
);

export const selectIsShowSideNav = createSelector(
  selectLayoutFeatureState,
  (state) => state.isShowSideNav,
);

export const selectIsShowNotes = createSelector(
  selectLayoutFeatureState,
  (state) => state.isShowNotes,
);

export const selectIsShowSearchBar = createSelector(
  selectLayoutFeatureState,
  (state) => state.isShowSearchBar,
);

const _reducer = createReducer<LayoutState>(
  _initialLayoutState,

  on(showAddTaskBar, (state) => ({ ...state, isShowAddTaskBar: true })),

  on(hideAddTaskBar, (state) => ({ ...state, isShowAddTaskBar: false })),

  on(toggleAddTaskBar, (state) => ({
    ...state,
    isShowAddTaskBar: !state.isShowAddTaskBar,
  })),

  on(showSearchBar, (state) => ({ ...state, isShowSearchBar: true })),

  on(hideSearchBar, (state) => ({ ...state, isShowSearchBar: false })),

  on(toggleSearchBar, (state) => ({
    ...state,
    isShowSearchBar: !state.isShowSearchBar,
  })),

  on(hideSideNav, (state) => ({ ...state, isShowSideNav: false })),

  on(toggleSideNav, (state) => ({ ...state, isShowSideNav: !state.isShowSideNav })),

  on(toggleShowNotes, (state) => ({ ...state, isShowNotes: !state.isShowNotes })),

  on(hideNotes, (state) => ({ ...state, isShowNotes: false })),
);

export const layoutReducer = (
  state: LayoutState = _initialLayoutState,
  action: Action,
): LayoutState => _reducer(state, action);
