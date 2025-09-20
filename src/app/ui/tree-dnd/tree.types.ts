export type TreeId = string;

export interface TreeNode<TData = unknown> {
  readonly id: TreeId;
  children?: TreeNode<TData>[];
  expanded?: boolean;
  readonly isFolder?: boolean;
  readonly data?: TData;
}

export interface TreeNodeMutable<TData = unknown> extends TreeNode<TData> {
  children?: TreeNodeMutable<TData>[];
}

export type DropWhere = 'before' | 'after' | 'inside' | 'root';

export const DROP_WHERE_VALUES = ['before', 'after', 'inside', 'root'] as const;

export const isDropWhere = (value: unknown): value is DropWhere =>
  typeof value === 'string' && DROP_WHERE_VALUES.includes(value as DropWhere);

export interface DropData {
  readonly type: 'drop';
  readonly id: TreeId;
  readonly where: DropWhere;
}

export interface DragData {
  readonly type: 'item';
  readonly id: TreeId;
  readonly uniqueContextId: symbol;
}

export type MoveTargetWhere = Exclude<DropWhere, 'root'> | 'inside';

export interface MoveInstruction {
  readonly itemId: TreeId;
  readonly targetId: TreeId | '';
  readonly where: MoveTargetWhere;
}

// Template context types
export interface ItemTplContext<TData = unknown> {
  readonly $implicit: TreeNode<TData>;
}

export interface FolderTplContext<TData = unknown> {
  readonly $implicit: TreeNode<TData>;
  readonly expanded: boolean;
  readonly toggle: (node: TreeNode<TData>) => void;
  readonly dragOver: boolean;
}

export interface DragPreviewTplContext<TData = unknown> {
  readonly $implicit: { node: TreeNode<TData>; isFolder: boolean };
  readonly id: TreeId;
  readonly element: HTMLElement;
}

// Predicate function types
export type CanDropPredicate<TData = unknown> = (ctx: CanDropContext<TData>) => boolean;

export interface CanDropContext<TData = unknown> {
  readonly drag: TreeNode<TData>;
  readonly drop: TreeNode<TData> | null;
  readonly where: DropWhere;
}

// Internal service interfaces
export interface HoverTarget {
  readonly id: TreeId;
  readonly where: DropWhere;
  readonly element: HTMLElement;
}

export interface DropListContext<TData = unknown> {
  readonly parentId: TreeId;
  readonly items: readonly TreeNode<TData>[];
}

// Utility types
export type TreeNodeWithChildren<TData = unknown> = TreeNode<TData> & {
  children: readonly TreeNode<TData>[];
};

export type TreeNodeFolder<TData = unknown> = TreeNode<TData> & {
  readonly isFolder: true;
};

// Event types
export interface TreeNodeEvent<TData = unknown> {
  readonly node: TreeNode<TData>;
}

export interface TreeMoveEvent<TData = unknown> extends TreeNodeEvent<TData> {
  readonly instruction: MoveInstruction;
}

export interface TreeUpdateEvent<TData = unknown> {
  readonly nodes: readonly TreeNode<TData>[];
}

// Shared interfaces
export interface PointerPosition {
  readonly x: number;
  readonly y: number;
}
