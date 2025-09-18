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

export const sanitizeProjectFolderTree = (value: unknown): ProjectFolderTreeNode[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((node) => sanitizeTreeNode(node))
    .filter((node): node is ProjectFolderTreeNode => !!node);
};

export const sanitizeProjectFolderState = (value: unknown): ProjectFolderState => {
  if (value && typeof value === 'object') {
    const maybeTree = (value as { tree?: unknown }).tree;
    if (Array.isArray(maybeTree)) {
      return { tree: sanitizeProjectFolderTree(maybeTree) } satisfies ProjectFolderState;
    }
  }
  return { tree: sanitizeProjectFolderTree(value) } satisfies ProjectFolderState;
};

const sanitizeTreeNode = (node: unknown): ProjectFolderTreeNode | null => {
  if (!node || typeof node !== 'object') {
    return null;
  }
  const raw = node as Record<string, unknown>;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : null;
  const kind =
    raw.kind === 'folder' ? 'folder' : raw.kind === 'project' ? 'project' : null;
  if (!id || !kind) {
    return null;
  }
  if (kind === 'folder') {
    const title = typeof raw.title === 'string' ? raw.title : '';
    const isExpanded = typeof raw.isExpanded === 'boolean' ? raw.isExpanded : true;
    const children = sanitizeProjectFolderTree(raw.children);
    return {
      id,
      kind,
      title,
      isExpanded,
      children,
    } satisfies ProjectFolderTreeNode;
  }
  return { id, kind: 'project' } satisfies ProjectFolderTreeNode;
};
