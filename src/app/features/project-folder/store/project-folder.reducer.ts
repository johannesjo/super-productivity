import { createReducer, on } from '@ngrx/store';
import { ProjectFolderState } from './project-folder.model';
import { updateProjectFolders } from './project-folder.actions';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';

export const projectFolderFeatureKey = 'projectFolder';

export const initialProjectFolderState: ProjectFolderState = {
  entities: {},
  ids: [],
  rootProjectIds: [],
};

// Export as initialState for compatibility with existing code
export const initialState = initialProjectFolderState;

export const projectFolderReducer = createReducer(
  initialProjectFolderState,
  // META ACTIONS
  // ------------
  on(
    loadAllData,
    (state, { appDataComplete }) => appDataComplete.projectFolder || initialState,
  ),

  on(updateProjectFolders, (state, { projectFolders, rootProjectIds }) => ({
    entities: Object.fromEntries(projectFolders.map((f) => [f.id, f])),
    ids: projectFolders.map((f) => f.id),
    rootProjectIds,
  })),
);
