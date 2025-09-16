import { MoveInstruction, TreeId, TreeNode } from './tree.types';

export const cloneNodes = (nodes: TreeNode[]): TreeNode[] =>
  nodes.map((n) => ({
    ...n,
    children: n.children ? cloneNodes(n.children) : undefined,
  }));

export const getPath = (nodes: TreeNode[], targetId: TreeId): TreeId[] | null => {
  const path: TreeId[] = [];
  const dfs = (list: TreeNode[], id: TreeId, acc: TreeId[]): boolean => {
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

export const isAncestor = (
  nodes: TreeNode[],
  ancestorId: TreeId,
  possibleDescendantId: TreeId,
): boolean => {
  const path = getPath(nodes, possibleDescendantId);
  return !!path?.includes(ancestorId);
};

export const findAndRemove = (
  nodes: TreeNode[],
  id: TreeId,
): { node: TreeNode | null } => {
  const stack: { parent: TreeNode | null; list: TreeNode[] }[] = [
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

export const getChildren = (nodes: TreeNode[], id: '' | TreeId): TreeNode[] => {
  if (id === '') return nodes;
  const stack = [...nodes];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.id === id) return (n.children ??= []);
    if (n.children) stack.push(...n.children);
  }
  return nodes;
};

export const moveNode = (data: TreeNode[], instr: MoveInstruction): TreeNode[] => {
  if (instr.targetId && instr.itemId === instr.targetId) return data; // no-op
  if (instr.targetId && isAncestor(data, instr.itemId, instr.targetId)) return data; // prevent into own child

  const nodes = cloneNodes(data);
  const { node } = findAndRemove(nodes, instr.itemId);
  if (!node) return data;

  if (instr.where === 'inside') {
    const children = getChildren(nodes, (instr.targetId as TreeId) ?? '');
    node.expanded ??= true;
    children.unshift(node);
    return nodes;
  }

  // before/after among siblings of target
  const parentChildren = getChildrenOfParent(nodes, instr.targetId);
  const index = parentChildren.findIndex((n) => n.id === instr.targetId);
  if (index === -1) return data;
  const insertIndex = instr.where === 'before' ? index : index + 1;
  parentChildren.splice(insertIndex, 0, node);
  return nodes;
};

const getChildrenOfParent = (nodes: TreeNode[], id: TreeId): TreeNode[] => {
  // returns the array that contains the node with id
  const stack: { parent: TreeNode | null; list: TreeNode[] }[] = [
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
