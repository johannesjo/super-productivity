import {
  hideAddTaskBar,
  hideNotes,
  showAddTaskBar,
  toggleAddTaskBar,
  toggleShowNotes,
  toggleSideBar
} from './layout.actions';
import {Action, createFeatureSelector, createReducer, createSelector, on} from '@ngrx/store';

export const LAYOUT_FEATURE_NAME = 'layout';

export interface LayoutState {
  isShowAddTaskBar: boolean;
  isShowBookmarkBar: boolean;
  isShowNotes: boolean;
  isShowSideBar: boolean;
}

const _initialLayoutState: LayoutState = {
  isShowAddTaskBar: false,
  isShowBookmarkBar: false,
  isShowSideBar: false,
  isShowNotes: false,
};

export const selectLayoutFeatureState = createFeatureSelector<LayoutState>(LAYOUT_FEATURE_NAME);

export const selectIsShowAddTaskBar = createSelector(selectLayoutFeatureState, state => state.isShowAddTaskBar);

export const selectIsShowSideBar = createSelector(selectLayoutFeatureState, state => state.isShowSideBar);

export const selectIsShowNotes = createSelector(selectLayoutFeatureState, (state) => state.isShowNotes);


const _reducer = createReducer<LayoutState>(
  _initialLayoutState,

  on(showAddTaskBar, (state) => ({...state, isShowAddTaskBar: true})),

  on(hideAddTaskBar, (state) => ({...state, isShowAddTaskBar: false})),

  on(toggleAddTaskBar, (state) => ({...state, isShowAddTaskBar: !state.isShowAddTaskBar})),

  on(toggleSideBar, (state) => ({...state, isShowSideBar: !state.isShowSideBar})),

  on(toggleShowNotes, (state) => ({...state, isShowNotes: !state.isShowNotes})),

  on(hideNotes, (state) => ({...state, isShowNotes: false})),
);

export function reducer(
  state = _initialLayoutState,
  action: Action
): LayoutState {
  return _reducer(state, action);
}
