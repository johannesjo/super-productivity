import { createReducer, on } from '@ngrx/store';
import { MenuTreeKind, MenuTreeState, MenuTreeTreeNode } from './menu-tree.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import {
  updateProjectTree,
  updateTagTree,
  deleteFolder,
  updateFolder,
} from './menu-tree.actions';

export const menuTreeFeatureKey = 'menuTree';

export const menuTreeInitialState: MenuTreeState = {
  projectTree: [],
  tagTree: [],
};

const _sanitizeTree = (tree: unknown): MenuTreeTreeNode[] =>
  Array.isArray(tree) ? (tree as MenuTreeTreeNode[]) : [];

const _deleteFolderFromTree = (
  tree: MenuTreeTreeNode[],
  folderId: string,
): MenuTreeTreeNode[] => {
  return tree
    .filter((node) => node.id !== folderId)
    .map((node) => {
      if (node.k === MenuTreeKind.FOLDER) {
        return {
          ...node,
          children: _deleteFolderFromTree(node.children, folderId),
        };
      }
      return node;
    });
};

const _updateFolderInTree = (
  tree: MenuTreeTreeNode[],
  folderId: string,
  name: string,
): MenuTreeTreeNode[] => {
  return tree.map((node) => {
    if (node.id === folderId && node.k === MenuTreeKind.FOLDER) {
      return {
        ...node,
        name,
      };
    }
    if (node.k === MenuTreeKind.FOLDER) {
      return {
        ...node,
        children: _updateFolderInTree(node.children, folderId, name),
      };
    }
    return node;
  });
};

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
  on(deleteFolder, (state, { folderId, treeType }) => ({
    ...state,
    projectTree:
      treeType === MenuTreeKind.PROJECT
        ? _deleteFolderFromTree(state.projectTree, folderId)
        : state.projectTree,
    tagTree:
      treeType === MenuTreeKind.TAG
        ? _deleteFolderFromTree(state.tagTree, folderId)
        : state.tagTree,
  })),
  on(updateFolder, (state, { folderId, name, treeType }) => ({
    ...state,
    projectTree:
      treeType === MenuTreeKind.PROJECT
        ? _updateFolderInTree(state.projectTree, folderId, name)
        : state.projectTree,
    tagTree:
      treeType === MenuTreeKind.TAG
        ? _updateFolderInTree(state.tagTree, folderId, name)
        : state.tagTree,
  })),
);
