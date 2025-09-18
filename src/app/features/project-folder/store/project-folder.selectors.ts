import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  ProjectFolderState,
  ProjectFolderTreeNode,
  ProjectFolderSummary,
} from './project-folder.model';
import { projectFolderFeatureKey } from './project-folder.reducer';

export const selectProjectFolderState = createFeatureSelector<ProjectFolderState>(
  projectFolderFeatureKey,
);

export const selectProjectFolderFeatureState = selectProjectFolderState;

export const selectProjectFolderTree = createSelector(
  selectProjectFolderState,
  (state) => state.tree,
);

const collectFolders = (
  nodes: ProjectFolderTreeNode[],
  parentId: string | null,
  acc: ProjectFolderSummary[],
): void => {
  nodes.forEach((node) => {
    if (node.kind === 'folder') {
      acc.push({
        id: node.id,
        title: node.title ?? '',
        parentId,
        isExpanded: node.isExpanded ?? true,
      });
      collectFolders(node.children ?? [], node.id, acc);
    }
  });
};

export const selectAllProjectFolders = createSelector(selectProjectFolderTree, (tree) => {
  const result: ProjectFolderSummary[] = [];
  collectFolders(tree, null, result);
  return result;
});

export const selectTopLevelFolders = createSelector(selectProjectFolderTree, (tree) =>
  tree.filter((node) => node.kind === 'folder'),
);
