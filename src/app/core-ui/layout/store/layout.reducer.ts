import { LayoutActions, LayoutActionTypes } from './layout.actions';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const LAYOUT_FEATURE_NAME = 'layout';

export interface LayoutState {
  isShowAddTaskBar: boolean;
  isShowBookmarkBar: boolean;
}

export const initialState: LayoutState = {
  isShowAddTaskBar: false,
  isShowBookmarkBar: false,
};

export const selectLayoutFeatureState = createFeatureSelector<LayoutState>(LAYOUT_FEATURE_NAME);

export const selectIsShowAddTaskBar = createSelector(selectLayoutFeatureState, state => state.isShowAddTaskBar);

export const selectIsShowBookmarkBar = createSelector(selectLayoutFeatureState, state => state.isShowBookmarkBar);


export function reducer(state: LayoutState = initialState, action: LayoutActions): LayoutState {
  switch (action.type) {

    case LayoutActionTypes.ShowAddTaskBar:
      return {...state, isShowAddTaskBar: true};

    case LayoutActionTypes.HideAddTaskBar:
      return {...state, isShowAddTaskBar: false};

    case LayoutActionTypes.ToggleAddTaskBar:
      return {...state, isShowAddTaskBar: !state.isShowAddTaskBar};


    case LayoutActionTypes.ShowBookmarkBar:
      return {...state, isShowBookmarkBar: true};

    case LayoutActionTypes.HideBookmarkBar:
      return {...state, isShowBookmarkBar: false};

    case LayoutActionTypes.ToggleBookmarkBar:
      return {...state, isShowBookmarkBar: !state.isShowBookmarkBar};

    default:
      return state;
  }
}
