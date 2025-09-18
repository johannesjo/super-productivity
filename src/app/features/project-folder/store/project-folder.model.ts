export type ProjectFolderNodeKind = 'folder' | 'project';

export interface ProjectFolderTreeNode {
  id: string;
  kind: ProjectFolderNodeKind;
  title?: string;
  isExpanded?: boolean;
  children?: ProjectFolderTreeNode[];
}

export type ProjectFolderTree = ProjectFolderTreeNode[];

export interface ProjectFolderState {
  tree: ProjectFolderTree;
}

export type ProjectFolderTreeState = ProjectFolderState;

export interface ProjectFolderSummary {
  id: string;
  title: string;
  parentId: string | null;
  isExpanded: boolean;
}
