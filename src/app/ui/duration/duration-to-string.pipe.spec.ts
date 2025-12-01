import { DurationToStringPipe, durationToString } from './duration-to-string.pipe';

describe('DurationToStringPipe', () => {
  it('create an instance', () => {
    const pipe = new DurationToStringPipe();
    expect(pipe).toBeTruthy();
  });

  describe('durationToString', () => {
    it('should handle SimpleDuration objects', () => {
      const duration = {
        asMilliseconds: () => 3661000, // 1 hour, 1 minute, 1 second
      };
      expect(durationToString(duration)).toBe('1h 1m 1s');
    });

    it('should handle objects with _milliseconds property', () => {
      const duration = {
        _milliseconds: 3661000, // 1 hour, 1 minute, 1 second
      };
      expect(durationToString(duration)).toBe('1h 1m 1s');
    });

    it('should handle milliseconds value', () => {
      expect(durationToString(3600000)).toBe('1h'); // 1 hour
      expect(durationToString(60000)).toBe('1m'); // 1 minute
      expect(durationToString(1000)).toBe('1s'); // 1 second
    });

    it('should handle complex durations', () => {
      expect(durationToString(90061000)).toBe('1d 1h 1m 1s'); // 1 day, 1 hour, 1 minute, 1 second
      expect(durationToString(3661000)).toBe('1h 1m 1s'); // 1 hour, 1 minute, 1 second
      expect(durationToString(7265000)).toBe('2h 1m 5s'); // 2 hours, 1 minute, 5 seconds
    });

    it('should handle duration strings (ISO 8601)', () => {
      expect(durationToString('PT1H30M')).toBe('1h 30m');
      expect(durationToString('PT2H')).toBe('2h');
      expect(durationToString('PT45M')).toBe('45m');
      expect(durationToString('PT30S')).toBe('30s');
      expect(durationToString('P1DT2H3M4S')).toBe('1d 2h 3m 4s');
    });

    it('should return empty string for invalid input', () => {
      expect(durationToString(null)).toBe('');
      expect(durationToString(undefined)).toBe('');
      expect(durationToString(0)).toBe('');
      expect(durationToString('')).toBe('');
    });
  });
});
