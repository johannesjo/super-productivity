export type TreeId = string;

export interface TreeNode {
  id: TreeId;
  label: string;
  children?: TreeNode[];
  expanded?: boolean;
  // mark as a folder even if children is empty
  isFolder?: boolean;
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
