import { createAction, props } from '@ngrx/store';
import { MenuTreeKind, MenuTreeTreeNode } from './menu-tree.model';

type MenuTreeItemKind = MenuTreeKind.PROJECT | MenuTreeKind.TAG;

export const updateProjectTree = createAction(
  '[MenuTree] Update Project Tree',
  props<{ tree: MenuTreeTreeNode[] }>(),
);

export const updateTagTree = createAction(
  '[MenuTree] Update Tag Tree',
  props<{ tree: MenuTreeTreeNode[] }>(),
);

export const deleteFolder = createAction(
  '[MenuTree] Delete Folder',
  props<{ folderId: string; treeType: MenuTreeItemKind }>(),
);

export const updateFolder = createAction(
  '[MenuTree] Update Folder',
  props<{ folderId: string; name: string; treeType: MenuTreeItemKind }>(),
);
