import { LayoutActions, LayoutActionTypes } from './layout.actions';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const LAYOUT_FEATURE_NAME = 'layout';

export interface LayoutState {
  isShowAddTaskBar: boolean;
}

export const initialState: LayoutState = {
  isShowAddTaskBar: false,
};

export const selectLayoutFeatureState = createFeatureSelector<LayoutState>(LAYOUT_FEATURE_NAME);

export const selectIsShowAddTaskBar = createSelector(selectLayoutFeatureState, state => state.isShowAddTaskBar);


export function reducer(state: LayoutState = initialState, action: LayoutActions): LayoutState {
  switch (action.type) {

    case LayoutActionTypes.ShowAddTaskBar:
      return {...state, isShowAddTaskBar: true};

    case LayoutActionTypes.HideAddTaskBar:
      return {...state, isShowAddTaskBar: false};

    case LayoutActionTypes.ToggleAddTaskBar:
      return {...state, isShowAddTaskBar: !state.isShowAddTaskBar};

    default:
      return state;
  }
}
