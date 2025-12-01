import {
  roundDuration,
  roundDurationVanilla,
  roundMinutes,
  parseMsToMinutes,
  SimpleDuration,
} from './round-duration';

describe('roundDuration', () => {
  describe('parseMsToMinutes', () => {
    it('should convert milliseconds to minutes', () => {
      expect(parseMsToMinutes(60000)).toBe(1);
      expect(parseMsToMinutes(120000)).toBe(2);
      expect(parseMsToMinutes(90000)).toBe(2); // rounds
    });

    it('should handle zero', () => {
      expect(parseMsToMinutes(0)).toBe(0);
    });

    it('should handle undefined as zero', () => {
      expect(parseMsToMinutes(undefined as any)).toBe(0);
    });
  });

  describe('roundMinutes', () => {
    it('should round minutes to nearest factor', () => {
      expect(roundMinutes(7, 5, false)).toBe(5);
      expect(roundMinutes(8, 5, false)).toBe(10);
      expect(roundMinutes(23, 15, false)).toBe(30);
    });

    it('should round up when isRoundUp is true', () => {
      expect(roundMinutes(7, 5, true)).toBe(10);
      expect(roundMinutes(10, 5, true)).toBe(10);
      expect(roundMinutes(11, 5, true)).toBe(15);
    });
  });

  describe('roundDurationVanilla', () => {
    it('should round to 5 minutes', () => {
      expect(roundDurationVanilla(7 * 60000, '5M')).toBe(5 * 60000);
      expect(roundDurationVanilla(8 * 60000, '5M')).toBe(10 * 60000);
    });

    it('should round to quarter hour', () => {
      expect(roundDurationVanilla(20 * 60000, 'QUARTER')).toBe(15 * 60000);
      expect(roundDurationVanilla(23 * 60000, 'QUARTER')).toBe(30 * 60000);
    });

    it('should round to half hour', () => {
      expect(roundDurationVanilla(20 * 60000, 'HALF')).toBe(30 * 60000);
      expect(roundDurationVanilla(40 * 60000, 'HALF')).toBe(30 * 60000);
      expect(roundDurationVanilla(50 * 60000, 'HALF')).toBe(60 * 60000);
    });

    it('should round to hour', () => {
      expect(roundDurationVanilla(30 * 60000, 'HOUR')).toBe(60 * 60000); // 30 minutes rounds to 1 hour
      expect(roundDurationVanilla(89 * 60000, 'HOUR')).toBe(60 * 60000); // 89 minutes rounds to 1 hour
      expect(roundDurationVanilla(91 * 60000, 'HOUR')).toBe(120 * 60000); // 91 minutes rounds to 2 hours
    });

    it('should return original value for invalid roundTo option', () => {
      expect(roundDurationVanilla(7 * 60000, 'INVALID' as any)).toBe(7 * 60000);
    });

    it('should round up when isRoundUp is true', () => {
      expect(roundDurationVanilla(7 * 60000, '5M', true)).toBe(10 * 60000);
      expect(roundDurationVanilla(16 * 60000, 'QUARTER', true)).toBe(30 * 60000);
    });
  });

  describe('roundDuration', () => {
    it('should accept number and return SimpleDuration', () => {
      const result = roundDuration(7 * 60000, '5M');
      expect(result.asMilliseconds()).toBe(5 * 60000);
      expect(typeof result.asMilliseconds).toBe('function');
    });

    it('should accept SimpleDuration and return SimpleDuration', () => {
      const input: SimpleDuration = {
        asMilliseconds: () => 7 * 60000,
      };
      const result = roundDuration(input, '5M');
      expect(result.asMilliseconds()).toBe(5 * 60000);
      expect(typeof result.asMilliseconds).toBe('function');
    });

    it('should handle rounding up', () => {
      const result = roundDuration(7 * 60000, '5M', true);
      expect(result.asMilliseconds()).toBe(10 * 60000);
    });

    it('should preserve the same behavior as roundDurationVanilla', () => {
      const testCases = [
        { ms: 7 * 60000, roundTo: '5M' as const },
        { ms: 23 * 60000, roundTo: 'QUARTER' as const },
        { ms: 40 * 60000, roundTo: 'HALF' as const },
        { ms: 89 * 60000, roundTo: 'HOUR' as const },
      ];

      testCases.forEach(({ ms, roundTo }) => {
        const momentResult = roundDuration(ms, roundTo).asMilliseconds();
        const vanillaResult = roundDurationVanilla(ms, roundTo);
        expect(momentResult).toBe(vanillaResult);
      });
    });
  });
});
