import { createReducer, on } from '@ngrx/store';
import { MenuTreeState } from './menu-tree.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';

export const menuTreeFeatureKey = 'menuTree';

export const menuTreeInitialState: MenuTreeState = {
  projectTree: [],
  tagTree: [],
};

export const menuTreeReducer = createReducer(
  menuTreeInitialState,
  on(loadAllData, (state, { appDataComplete }) => {
    const stored =
      appDataComplete && typeof appDataComplete === 'object'
        ? (appDataComplete as Record<string, unknown>).menuTree
        : undefined;
    if (!stored) {
      return menuTreeInitialState;
    }
    return state;
  }),

  // on(updateMenuTrees, (state, { tree }) => ({
  //   tree,
  // })),
);
