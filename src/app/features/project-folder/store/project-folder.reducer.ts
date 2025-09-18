import { createReducer, on } from '@ngrx/store';
import { updateProjectFolders } from './project-folder.actions';
import { ProjectFolderState, ProjectFolderTreeNode } from './project-folder.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';

export const projectFolderFeatureKey = 'projectFolder';

export const initialState: ProjectFolderState = {
  tree: [],
};

const ensureTreeArray = (value: unknown): ProjectFolderTreeNode[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (node): node is ProjectFolderTreeNode => !!node && typeof node.id === 'string',
  );
};

export const projectFolderReducer = createReducer(
  initialState,
  on(loadAllData, (state, { appDataComplete }) => {
    const stored = (appDataComplete as any)?.projectFolder;
    if (!stored || typeof stored !== 'object') {
      return initialState;
    }
    const tree = ensureTreeArray((stored as any).tree);
    return { tree } satisfies ProjectFolderState;
  }),
  on(updateProjectFolders, (state, { tree }) => ({ tree })),
);
