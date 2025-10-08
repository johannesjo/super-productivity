import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';

export enum MenuTreeKind {
  FOLDER = 'f',
  PROJECT = 'p',
  TAG = 't',
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
  k: MenuTreeNodeKind;
}

export interface MenuTreeProjectNode extends MenuTreeBaseNode {
  k: MenuTreeKind.PROJECT;
}

export interface MenuTreeTagNode extends MenuTreeBaseNode {
  k: MenuTreeKind.TAG;
}

export interface MenuTreeFolderNode extends MenuTreeBaseNode {
  k: MenuTreeKind.FOLDER;
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
  k: MenuTreeKind.FOLDER;
  id: string;
  name: string;
  isExpanded: boolean;
  children: MenuTreeViewNode[];
}

export interface MenuTreeViewProjectNode {
  k: MenuTreeKind.PROJECT;
  project: Project;
}

export interface MenuTreeViewTagNode {
  k: MenuTreeKind.TAG;
  tag: Tag;
}
