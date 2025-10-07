import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';

export enum MenuTreeKind {
  FOLDER = 'folder',
  PROJECT = 'project',
  TAG = 'tag',
}

export type MenuTreeNodeKind =
  | MenuTreeKind.FOLDER
  | MenuTreeKind.PROJECT
  | MenuTreeKind.TAG;

export interface MenuTreeState {
  projectTree: MenuTreeTreeNode[];
  tagTree: MenuTreeTreeNode[];
}

interface MenuTreeBaseNode {
  id: string;
  kind: MenuTreeNodeKind;
}

export interface MenuTreeProjectNode extends MenuTreeBaseNode {
  kind: MenuTreeKind.PROJECT;
}

export interface MenuTreeTagNode extends MenuTreeBaseNode {
  kind: MenuTreeKind.TAG;
}

export interface MenuTreeFolderNode extends MenuTreeBaseNode {
  kind: MenuTreeKind.FOLDER;
  children: MenuTreeTreeNode[];
  name: string;
  isExpanded?: boolean;
}

export type MenuTreeTreeNode = MenuTreeFolderNode | MenuTreeProjectNode | MenuTreeTagNode;

// -----------------------------------------------------------
// View model used by the navigation to render tree nodes with hydrated data
// -----------------------------------------------------------
export type MenuTreeViewNode =
  | MenuTreeViewFolderNode
  | MenuTreeViewProjectNode
  | MenuTreeViewTagNode;

export interface MenuTreeViewFolderNode {
  kind: MenuTreeKind.FOLDER;
  id: string;
  name: string;
  isExpanded: boolean;
  children: MenuTreeViewNode[];
}

export interface MenuTreeViewProjectNode {
  kind: MenuTreeKind.PROJECT;
  project: Project;
}

export interface MenuTreeViewTagNode {
  kind: MenuTreeKind.TAG;
  tag: Tag;
}
