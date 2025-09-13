import { asDragData, asDropData, makeDragData, makeDropData } from './dnd.helpers';

describe('dnd.helpers', () => {
  it('creates and parses DragData safely', () => {
    const ctx = Symbol('ctx');
    const anyData = makeDragData(ctx, 'X');
    const parsed = asDragData(anyData);
    expect(parsed).toBeTruthy();
    expect(parsed!.id).toBe('X');
    expect(parsed!.uniqueContextId).toBe(ctx);
  });

  it('rejects invalid DragData', () => {
    const parsed = asDragData({ foo: 'bar' } as any);
    expect(parsed).toBeNull();
  });

  it('creates and parses DropData safely', () => {
    const anyDrop = makeDropData({ type: 'drop', id: 'A', where: 'before' });
    const parsed = asDropData(anyDrop);
    expect(parsed).toEqual({ type: 'drop', id: 'A', where: 'before' });
  });

  it('handles root drop', () => {
    const anyDrop = makeDropData({ type: 'drop', id: '', where: 'root' });
    const parsed = asDropData(anyDrop);
    expect(parsed).toEqual({ type: 'drop', id: '', where: 'root' });
  });
});
