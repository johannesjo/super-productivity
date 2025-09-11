import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProjectFolderState } from '../project-folder.model';
import { adapter, projectFolderFeatureKey } from './project-folder.reducer';

export const selectProjectFolderState = createFeatureSelector<ProjectFolderState>(
  projectFolderFeatureKey,
);

const { selectAll, selectEntities, selectIds, selectTotal } = adapter.getSelectors(
  selectProjectFolderState,
);

export const selectAllProjectFolders = selectAll;
export const selectProjectFolderEntities = selectEntities;
export const selectProjectFolderIds = selectIds;
export const selectProjectFolderTotal = selectTotal;
export const selectProjectFolderFeatureState = selectProjectFolderState;

export const selectProjectFolderById = createSelector(
  selectProjectFolderEntities,
  (entities, props: { id: string }) => entities[props.id],
);

export const selectTopLevelFolders = createSelector(selectAllProjectFolders, (folders) =>
  folders.filter((folder) => !folder.parentId),
);

export const selectFoldersByParentId = createSelector(
  selectAllProjectFolders,
  (folders, props: { parentId: string | null }) =>
    folders.filter((folder) => folder.parentId === props.parentId),
);

export const selectExpandedFolderIds = createSelector(
  selectAllProjectFolders,
  (folders) => folders.filter((folder) => folder.isExpanded).map((folder) => folder.id),
);
