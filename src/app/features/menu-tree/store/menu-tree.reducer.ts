import { createReducer, on } from '@ngrx/store';
import { MenuTreeState, MenuTreeTreeNode } from './menu-tree.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { updateProjectTree, updateTagTree } from './menu-tree.actions';

export const menuTreeFeatureKey = 'menuTree';

export const menuTreeInitialState: MenuTreeState = {
  projectTree: [],
  tagTree: [],
};

const _sanitizeTree = (tree: unknown): MenuTreeTreeNode[] =>
  Array.isArray(tree) ? (tree as MenuTreeTreeNode[]) : [];

export const menuTreeReducer = createReducer(
  menuTreeInitialState,
  on(loadAllData, (_state, { appDataComplete }) => {
    const stored =
      appDataComplete && typeof appDataComplete === 'object'
        ? ((appDataComplete as Record<string, unknown>).menuTree as
            | MenuTreeState
            | undefined)
        : undefined;
    if (!stored) {
      return menuTreeInitialState;
    }
    return {
      projectTree: _sanitizeTree(stored.projectTree),
      tagTree: _sanitizeTree(stored.tagTree),
    } satisfies MenuTreeState;
  }),
  on(updateProjectTree, (state, { tree }) => ({
    ...state,
    projectTree: tree,
  })),
  on(updateTagTree, (state, { tree }) => ({
    ...state,
    tagTree: tree,
  })),
);
