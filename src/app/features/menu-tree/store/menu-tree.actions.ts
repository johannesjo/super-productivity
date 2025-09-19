import { createAction, props } from '@ngrx/store';
import { MenuTreeTreeNode } from './menu-tree.model';

export const updateProjectTree = createAction(
  '[MenuTree] Update Project Tree',
  props<{ tree: MenuTreeTreeNode[] }>(),
);

export const updateTagTree = createAction(
  '[MenuTree] Update Tag Tree',
  props<{ tree: MenuTreeTreeNode[] }>(),
);
