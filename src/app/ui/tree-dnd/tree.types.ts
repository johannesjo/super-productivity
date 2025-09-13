export type TreeId = string;

export interface TreeNode<T = undefined> {
  id: TreeId;
  label?: string;
  children?: TreeNode<T>[];
  expanded?: boolean;
  // mark as a folder even if children is empty
  isFolder?: boolean;
  data?: T;
}

export type DropWhere = 'before' | 'after' | 'inside' | 'root';

export interface DropData {
  type: 'drop';
  id: TreeId;
  where: DropWhere;
}

export interface DragData {
  type: 'item';
  id: TreeId;
  uniqueContextId: symbol;
}

export interface MoveInstruction {
  itemId: TreeId;
  targetId: TreeId | '';
  where: Exclude<DropWhere, 'root'> | 'inside';
}

// Template context types
export interface ItemTplContext {
  $implicit: TreeNode;
}

export interface FolderTplContext {
  $implicit: TreeNode;
  expanded: boolean;
  toggle: (node: TreeNode) => void;
  dragOver: boolean;
}
