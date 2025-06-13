// describe('StringToMsPipe', () => {
//   it('create an instance', () => {
//     const pipe = new StringToMsPipe();
//     expect(pipe).toBeTruthy();
//   });
// });

import { stringToMs } from './string-to-ms.pipe';

describe('stringToMs', () => {
  it('should work', () => {
    expect(stringToMs('1h 10m')).toBe(4200000);
  });

  // @covers #463
  it('should not return NaN for just h', () => {
    expect(stringToMs('h')).toBe(0);
  });

  // @covers #3737
  it('should work improved', () => {
    // Case: no spaces.
    expect(stringToMs('1h10m')).toBe(4200000);

    // Case: missing last unit.
    expect(stringToMs('1h 10')).toBe(4200000);
    expect(stringToMs('1h10')).toBe(4200000);

    // Case: missing all units.
    expect(stringToMs('10')).toBe(0);

    // Case: using floats (with dot or comma separator).
    expect(stringToMs('1.5h')).toBe(5400000);
    expect(stringToMs('1,5h')).toBe(5400000);

    // Case: combining floats with subunits (opinionated choice: adds up).
    expect(stringToMs('1,5h 10m')).toBe(6000000);
  });

  describe('zero values', () => {
    it('should handle 0m correctly', () => {
      expect(stringToMs('0m')).toBe(0);
    });

    it('should handle 0h correctly', () => {
      expect(stringToMs('0h')).toBe(0);
    });

    it('should handle 0s correctly', () => {
      expect(stringToMs('0s')).toBe(0);
    });

    it('should handle 0d correctly', () => {
      expect(stringToMs('0d')).toBe(0);
    });

    it('should handle 0 without unit', () => {
      expect(stringToMs('0')).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(stringToMs('')).toBe(0);
    });

    it('should handle null', () => {
      expect(stringToMs(null as any)).toBe(0);
    });

    it('should handle undefined', () => {
      expect(stringToMs(undefined as any)).toBe(0);
    });

    it('should handle whitespace only', () => {
      expect(stringToMs('   ')).toBe(0);
    });

    it('should handle invalid format', () => {
      expect(stringToMs('abc')).toBe(0);
      expect(stringToMs('123abc')).toBe(0);
    });
  });

  describe('all time units', () => {
    it('should handle seconds', () => {
      expect(stringToMs('30s')).toBe(30000);
      expect(stringToMs('1.5s')).toBe(1500);
    });

    it('should handle minutes', () => {
      expect(stringToMs('30m')).toBe(1800000);
      expect(stringToMs('1.5m')).toBe(90000);
    });

    it('should handle hours', () => {
      expect(stringToMs('2h')).toBe(7200000);
      expect(stringToMs('1.5h')).toBe(5400000);
    });

    it('should handle days', () => {
      expect(stringToMs('1d')).toBe(86400000);
      expect(stringToMs('0.5d')).toBe(43200000);
    });
  });

  describe('complex formats', () => {
    it('should handle all units combined', () => {
      expect(stringToMs('1d 2h 3m 4s')).toBe(93784000);
    });

    it('should handle units in any order', () => {
      expect(stringToMs('3m 2h 1d 4s')).toBe(93784000);
    });

    it('should handle repeated units (last wins)', () => {
      expect(stringToMs('1h 30m 45m')).toBe(6300000); // 1h + 45m (30m is overwritten)
    });
  });
});
