import { createAction, props } from '@ngrx/store';
import { ProjectFolder } from '../project-folder.model';

export const addProjectFolder = createAction(
  '[ProjectFolder] Add Project Folder',
  props<{ projectFolder: ProjectFolder }>(),
);

export const updateProjectFolder = createAction(
  '[ProjectFolder] Update Project Folder',
  props<{ id: string; changes: Partial<ProjectFolder> }>(),
);

export const deleteProjectFolder = createAction(
  '[ProjectFolder] Delete Project Folder',
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
