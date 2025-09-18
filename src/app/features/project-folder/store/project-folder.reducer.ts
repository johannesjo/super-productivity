import { createReducer, on } from '@ngrx/store';
import { updateProjectFolders } from './project-folder.actions';
import {
  ProjectFolderState,
  sanitizeProjectFolderState,
  sanitizeProjectFolderTree,
} from './project-folder.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';

export const projectFolderFeatureKey = 'projectFolder';

export const initialState: ProjectFolderState = {
  tree: [],
};

export const projectFolderReducer = createReducer(
  initialState,
  on(loadAllData, (state, { appDataComplete }) => {
    const stored =
      appDataComplete && typeof appDataComplete === 'object'
        ? (appDataComplete as Record<string, unknown>).projectFolder
        : undefined;
    if (!stored) {
      return initialState;
    }
    return sanitizeProjectFolderState(stored);
  }),
  on(updateProjectFolders, (state, { tree }) => ({
    tree: sanitizeProjectFolderTree(tree),
  })),
);
