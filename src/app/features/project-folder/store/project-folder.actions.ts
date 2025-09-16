import { createAction, props } from '@ngrx/store';
import { ProjectFolder } from './project-folder.model';

export const updateProjectFolders = createAction(
  '[ProjectFolder] Update Project Folders',
  props<{ projectFolders: ProjectFolder[]; rootProjectIds: string[] }>(),
);
