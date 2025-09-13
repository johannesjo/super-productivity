import { moveNode, isAncestor, getPath } from './tree.utils';
import type { TreeNode, MoveInstruction } from './tree.types';

function root(...children: TreeNode[]): TreeNode[] {
  return children;
}

describe('tree.utils', () => {
  it('moves before a sibling', () => {
    const data = root(
      { id: 'A', label: 'A' },
      { id: 'B', label: 'B' },
      { id: 'C', label: 'C' },
    );

    const instr: MoveInstruction = { itemId: 'C', targetId: 'A', where: 'before' };
    const result = moveNode(data, instr);
    expect(result.map((n) => n.id)).toEqual(['C', 'A', 'B']);
  });

  it('moves after a sibling', () => {
    const data = root(
      { id: 'A', label: 'A' },
      { id: 'B', label: 'B' },
      { id: 'C', label: 'C' },
    );

    const instr: MoveInstruction = { itemId: 'A', targetId: 'B', where: 'after' };
    const result = moveNode(data, instr);
    expect(result.map((n) => n.id)).toEqual(['B', 'A', 'C']);
  });

  it('moves inside a folder (as first child)', () => {
    const data = root(
      {
        id: 'A',
        label: 'A',
        isFolder: true,
        expanded: true,
        children: [{ id: 'A1', label: 'A1' }],
      },
      { id: 'B', label: 'B' },
    );
    const instr: MoveInstruction = { itemId: 'B', targetId: 'A', where: 'inside' };
    const result = moveNode(data, instr);
    const a = result.find((n) => n.id === 'A')!;
    expect(a.children?.map((n) => n.id)).toEqual(['B', 'A1']);
  });

  it('prevents moving into own descendant', () => {
    const data = root({
      id: 'A',
      label: 'A',
      expanded: true,
      children: [{ id: 'A1', label: 'A1' }],
    });
    const instr: MoveInstruction = { itemId: 'A', targetId: 'A1', where: 'inside' };
    const result = moveNode(data, instr);
    // unchanged
    expect(result).toEqual(data);
  });

  it('moves to root when target is empty string and where is inside', () => {
    const data = root({
      id: 'A',
      label: 'A',
      expanded: true,
      children: [{ id: 'A1', label: 'A1' }],
    });
    const instr: MoveInstruction = { itemId: 'A1', targetId: '', where: 'inside' };
    const result = moveNode(data, instr);
    expect(result.map((n) => n.id)).toEqual(['A1', 'A']);
  });

  it('isAncestor and getPath basics', () => {
    const data = root(
      {
        id: 'A',
        label: 'A',
        children: [{ id: 'A1', label: 'A1', children: [{ id: 'A1a', label: 'A1a' }] }],
      },
      { id: 'B', label: 'B' },
    );

    expect(isAncestor(data, 'A', 'A1a')).toBeTrue();
    expect(isAncestor(data, 'A1', 'A1a')).toBeTrue();
    expect(isAncestor(data, 'B', 'A1a')).toBeFalse();
    expect(getPath(data, 'A1a')).toEqual(['A', 'A1', 'A1a']);
  });
});
