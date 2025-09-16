import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProjectFolderState } from './project-folder.model';
import { projectFolderFeatureKey } from './project-folder.reducer';

export const selectProjectFolderState = createFeatureSelector<ProjectFolderState>(
  projectFolderFeatureKey,
);

// Export with the name expected by existing code
export const selectProjectFolderFeatureState = selectProjectFolderState;

export const selectAllProjectFolders = createSelector(selectProjectFolderState, (state) =>
  state.ids.map((id) => state.entities[id]),
);

export const selectProjectFolderEntities = createSelector(
  selectProjectFolderState,
  (state) => state.entities,
);

export const selectProjectFolderIds = createSelector(
  selectProjectFolderState,
  (state) => state.ids,
);
