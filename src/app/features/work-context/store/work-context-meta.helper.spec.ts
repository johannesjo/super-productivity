import { moveItemInList } from './work-context-meta.helper';

describe('moveItemInList()', () => {
  it('should work for moving INSIDE an unfiltered list', () => {
    const result = moveItemInList('x', ['x', 'A', 'B'], ['A', 'x', 'B']);
    expect(result).toEqual(['A', 'x', 'B']);
  });

  it('should work for moving INSIDE a filtered list', () => {
    const result = moveItemInList('x', ['x', 'A', 'B', 'C'], ['A', 'x', 'B']);
    expect(result).toEqual(['A', 'x', 'B', 'C']);
  });

  it('should work for moving INTO an unfiltered list', () => {
    const result = moveItemInList('x', ['A', 'B', 'C'], ['A', 'B', 'x', 'C']);
    expect(result).toEqual(['A', 'B', 'x', 'C']);
  });

  it('should work for moving INTO a filtered list', () => {
    const result = moveItemInList('x', ['A', 'B', 'C'], ['B', 'x']);
    expect(result).toEqual(['A', 'B', 'x', 'C']);
  });

  it('should work for moving INTO a filtered list with only one item after', () => {
    const result = moveItemInList('x', ['A', 'B', 'C'], ['x', 'C']);
    expect(result).toEqual(['A', 'B', 'x', 'C']);
  });

  it('should work for moving INTO a filtered list with only one item after', () => {
    const result = moveItemInList('x', ['A', 'B', 'C'], ['x', 'C']);
    expect(result).toEqual(['A', 'B', 'x', 'C']);
  });

  it('should work for moving INTO an empty filtered list with hidden items', () => {
    const result = moveItemInList('x', ['A', 'B', 'C'], ['x'], 0);
    expect(result).toEqual(['x', 'A', 'B', 'C']);
  });

  it('should work for moving INTO an empty filtered list with hidden items 2', () => {
    const result = moveItemInList('x', ['A', 'B', 'C'], ['x'], 3);
    expect(result).toEqual(['A', 'B', 'C', 'x']);
  });

  it('should work for moving INTO an empty list (without unfiltered items)', () => {
    const result = moveItemInList('x', [], ['x']);
    expect(result).toEqual(['x']);
  });
});
