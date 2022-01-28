import { isValidSplitTime } from './is-valid-split-time';

describe('isValidSplitTime()', () => {
  it('should return true for a valid string', () => {
    expect(isValidSplitTime('11:00')).toBe(true);
  });

  ['sad', 123, null, undefined, '¹23sd:23', '123:232', '011:00', ''].forEach((v) => {
    it('should return false for invalid string', () => {
      expect(isValidSplitTime(v as any)).toBe(false);
    });
  });
});
