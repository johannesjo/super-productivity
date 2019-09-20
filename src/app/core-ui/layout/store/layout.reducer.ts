import {
  hideAddTaskBar,
  hideNotes,
  showAddTaskBar,
  toggleAddTaskBar,
  toggleShowNotes,
  toggleSideNav
} from './layout.actions';
import {Action, createFeatureSelector, createReducer, createSelector, on} from '@ngrx/store';

export const LAYOUT_FEATURE_NAME = 'layout';

export interface LayoutState {
  isShowAddTaskBar: boolean;
  isShowBookmarkBar: boolean;
  isShowNotes: boolean;
  isShowSideNav: boolean;
}

const _initialLayoutState: LayoutState = {
  isShowAddTaskBar: false,
  isShowBookmarkBar: false,
  isShowSideNav: false,
  isShowNotes: false,
};

export const selectLayoutFeatureState = createFeatureSelector<LayoutState>(LAYOUT_FEATURE_NAME);

export const selectIsShowAddTaskBar = createSelector(selectLayoutFeatureState, state => state.isShowAddTaskBar);

export const selectIsShowSideNav = createSelector(selectLayoutFeatureState, state => state.isShowSideNav);

export const selectIsShowNotes = createSelector(selectLayoutFeatureState, (state) => state.isShowNotes);


const _reducer = createReducer<LayoutState>(
  _initialLayoutState,

  on(showAddTaskBar, (state) => ({...state, isShowAddTaskBar: true})),

  on(hideAddTaskBar, (state) => ({...state, isShowAddTaskBar: false})),

  on(toggleAddTaskBar, (state) => ({...state, isShowAddTaskBar: !state.isShowAddTaskBar})),

  on(toggleSideNav, (state) => ({...state, isShowSideBar: !state.isShowSideNav})),

  on(toggleShowNotes, (state) => ({...state, isShowNotes: !state.isShowNotes})),

  on(hideNotes, (state) => ({...state, isShowNotes: false})),
);

export function reducer(
  state = _initialLayoutState,
  action: Action
): LayoutState {
  return _reducer(state, action);
}
