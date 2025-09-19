import { Project } from '../../project/project.model';
import { Tag } from '../../tag/tag.model';

export type MenuTreeNodeKind = 'folder' | 'project' | 'tag';

export interface MenuTreeState {
  projectTree: MenuTreeTreeNode[];
  tagTree: MenuTreeTreeNode[];
}

interface MenuTreeBaseNode {
  id: string;
  kind: MenuTreeNodeKind;
}

export interface MenuTreeProjectNode extends MenuTreeBaseNode {
  kind: 'project';
  projectId: string;
}

export interface MenuTreeTagNode extends MenuTreeBaseNode {
  kind: 'tag';
  tagId: string;
}

export interface MenuTreeFolderNode extends MenuTreeBaseNode {
  kind: 'folder';
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
  kind: 'folder';
  id: string;
  name: string;
  isExpanded: boolean;
  children: MenuTreeViewNode[];
}

export interface MenuTreeViewProjectNode {
  kind: 'project';
  project: Project;
}

export interface MenuTreeViewTagNode {
  kind: 'tag';
  tag: Tag;
}
