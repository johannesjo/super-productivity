import { createAction, props } from '@ngrx/store';
import { ProjectFolderTree } from './project-folder.model';

export const updateProjectFolders = createAction(
  '[ProjectFolder] Update Project Folders',
  props<{ tree: ProjectFolderTree }>(),
);
