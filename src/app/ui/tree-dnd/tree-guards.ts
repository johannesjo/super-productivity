import { TreeId, TreeNode } from './tree.types';

export const isTreeId = (value: unknown): value is TreeId =>
  typeof value === 'string' && value.length > 0;

export const isTreeNode = <TData = unknown>(value: unknown): value is TreeNode<TData> => {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  return 'id' in obj && isTreeId(obj['id']);
};

export const assertTreeId: (
  value: unknown,
  context?: string,
) => asserts value is TreeId = (
  value: unknown,
  context = 'value',
): asserts value is TreeId => {
  if (!isTreeId(value)) {
    throw new TypeError(`Expected ${context} to be a valid TreeId, got: ${typeof value}`);
  }
};
