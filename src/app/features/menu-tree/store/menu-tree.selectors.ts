import { createFeatureSelector } from '@ngrx/store';
import { MenuTreeState } from './menu-tree.model';
import { menuTreeFeatureKey } from './menu-tree.reducer';

export const selectMenuTreeState =
  createFeatureSelector<MenuTreeState>(menuTreeFeatureKey);

export const selectMenuTreeFeatureState = selectMenuTreeState;
