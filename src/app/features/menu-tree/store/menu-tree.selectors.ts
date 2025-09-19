import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MenuTreeState } from './menu-tree.model';
import { menuTreeFeatureKey } from './menu-tree.reducer';

export const selectMenuTreeState =
  createFeatureSelector<MenuTreeState>(menuTreeFeatureKey);

export const selectMenuTreeProjectTree = createSelector(
  selectMenuTreeState,
  (state) => state.projectTree,
);

export const selectMenuTreeTagTree = createSelector(
  selectMenuTreeState,
  (state) => state.tagTree,
);
