import {moveItemInList} from './work-context-meta.helper';

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
});
