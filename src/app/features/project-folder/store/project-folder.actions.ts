import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { ProjectFolder } from '../project-folder.model';

export const loadProjectFolders = createAction('[ProjectFolder] Load Project Folders');

export const loadProjectFoldersSuccess = createAction(
  '[ProjectFolder] Load Project Folders Success',
  props<{ projectFolders: ProjectFolder[] }>(),
);

export const addProjectFolder = createAction(
  '[ProjectFolder] Add Project Folder',
  props<{ projectFolder: ProjectFolder }>(),
);

export const addProjectFolderSuccess = createAction(
  '[ProjectFolder] Add Project Folder Success',
  props<{ projectFolder: ProjectFolder }>(),
);

export const updateProjectFolder = createAction(
  '[ProjectFolder] Update Project Folder',
  props<{ id: string; changes: Partial<ProjectFolder> }>(),
);

export const updateProjectFolderSuccess = createAction(
  '[ProjectFolder] Update Project Folder Success',
  props<{ update: Update<ProjectFolder> }>(),
);

export const deleteProjectFolder = createAction(
  '[ProjectFolder] Delete Project Folder',
  props<{ id: string }>(),
);

export const deleteProjectFolderSuccess = createAction(
  '[ProjectFolder] Delete Project Folder Success',
  props<{ id: string }>(),
);

export const toggleFolderExpansion = createAction(
  '[ProjectFolder] Toggle Folder Expansion',
  props<{ id: string }>(),
);

export const updateProjectFolderOrder = createAction(
  '[ProjectFolder] Update Project Folder Order',
  props<{ ids: string[] }>(),
);
