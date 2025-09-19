import { s } from '@angular/cdk/scrolling-module.d-3Rw5UxLk';
import { Project } from '../../project/project.model';

export type MenuTreeNodeKind = 'folder' | 'project';

export interface MenuTreeState {
  projectTree: MenuTreeTreeNode[];
  tagTree: MenuTreeTreeNode[];
}

interface MenuTreeBaseNode {
  id: s;
  name: string;
  kind: MenuTreeNodeKind;
}

export interface ProjectNode extends MenuTreeBaseNode {
  kind: 'project';
  data: Project;
}

export interface FolderNode extends MenuTreeBaseNode {
  kind: 'folder';
  children: MenuTreeTreeNode[];
  isExpanded?: boolean;
}

export type MenuTreeTreeNode = FolderNode | ProjectNode;
