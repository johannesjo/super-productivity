import { MoveInstruction, TreeId, TreeNode } from './tree.types';

export const cloneNodes = <TData = unknown>(
  nodes: readonly TreeNode<TData>[],
): TreeNode<TData>[] =>
  nodes.map((n) => ({
    ...n,
    children: n.children ? cloneNodes(n.children) : undefined,
  }));

export const getPath = <TData = unknown>(
  nodes: readonly TreeNode<TData>[],
  targetId: TreeId,
): TreeId[] | null => {
  const path: TreeId[] = [];
  const dfs = (list: readonly TreeNode<TData>[], id: TreeId, acc: TreeId[]): boolean => {
    for (const node of list) {
      acc.push(node.id);
      if (node.id === id) return true;
      if (node.children && dfs(node.children, id, acc)) return true;
      acc.pop();
    }
    return false;
  };
  const found = dfs(nodes, targetId, path);
  return found ? path : null;
};

export const isAncestor = <TData = unknown>(
  nodes: readonly TreeNode<TData>[],
  ancestorId: TreeId,
  possibleDescendantId: TreeId,
): boolean => {
  const path = getPath(nodes, possibleDescendantId);
  return !!path?.includes(ancestorId);
};

export const findAndRemove = <TData = unknown>(
  nodes: TreeNode<TData>[],
  id: TreeId,
): { node: TreeNode<TData> | null } => {
  const stack: { parent: TreeNode<TData> | null; list: TreeNode<TData>[] }[] = [
    { parent: null, list: nodes },
  ];
  while (stack.length) {
    const { list } = stack.pop()!;
    const idx = list.findIndex((n) => n.id === id);
    if (idx !== -1) {
      const [node] = list.splice(idx, 1);
      return { node };
    }
    for (const n of list) {
      if (n.children?.length) stack.push({ parent: n, list: n.children });
    }
  }
  return { node: null };
};

export const getChildren = <TData = unknown>(
  nodes: TreeNode<TData>[],
  id: '' | TreeId,
): TreeNode<TData>[] => {
  if (id === '') return nodes;
  const stack = [...nodes];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.id === id) return (n.children ??= []);
    if (n.children) stack.push(...n.children);
  }
  return nodes;
};

export const moveNode = <TData = unknown>(
  data: readonly TreeNode<TData>[],
  instr: MoveInstruction,
): TreeNode<TData>[] => {
  if (instr.targetId && instr.itemId === instr.targetId) return cloneNodes(data); // no-op
  if (instr.targetId && isAncestor(data, instr.itemId, instr.targetId))
    return cloneNodes(data); // prevent into own child

  const nodes = cloneNodes(data);
  const { node } = findAndRemove(nodes, instr.itemId);
  if (!node) return cloneNodes(data);

  if (instr.where === 'inside') {
    const children = getChildren(nodes, (instr.targetId as TreeId) ?? '');
    node.expanded ??= true;
    children.unshift(node);
    return nodes;
  }

  // before/after among siblings of target
  const parentChildren = getChildrenOfParent(nodes, instr.targetId);
  const index = parentChildren.findIndex((n) => n.id === instr.targetId);
  if (index === -1) return cloneNodes(data);
  const insertIndex = instr.where === 'before' ? index : index + 1;
  parentChildren.splice(insertIndex, 0, node);
  return nodes;
};

const getChildrenOfParent = <TData = unknown>(
  nodes: TreeNode<TData>[],
  id: TreeId,
): TreeNode<TData>[] => {
  // returns the array that contains the node with id
  const stack: { parent: TreeNode<TData> | null; list: TreeNode<TData>[] }[] = [
    { parent: null, list: nodes },
  ];
  while (stack.length) {
    const ctx = stack.pop()!;
    const idx = ctx.list.findIndex((n) => n.id === id);
    if (idx !== -1) return ctx.list;
    for (const n of ctx.list) {
      if (n.children?.length) stack.push({ parent: n, list: n.children });
    }
  }
  return nodes;
};
