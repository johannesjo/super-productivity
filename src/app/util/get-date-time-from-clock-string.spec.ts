import { getDateTimeFromClockString } from './get-date-time-from-clock-string';

describe('getDateTimeFromClockString', () => {
  describe('basic functionality', () => {
    it('should convert clock string to timestamp for given date', () => {
      const baseDate = new Date(2024, 0, 15); // January 15, 2024
      const result = getDateTimeFromClockString('14:30', baseDate);

      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(14);
      expect(resultDate.getMinutes()).toBe(30);
      expect(resultDate.getSeconds()).toBe(0);
      expect(resultDate.getMilliseconds()).toBe(0);

      // Date should remain the same
      expect(resultDate.getFullYear()).toBe(2024);
      expect(resultDate.getMonth()).toBe(0);
      expect(resultDate.getDate()).toBe(15);
    });

    it('should work with timestamp input', () => {
      const baseTimestamp = new Date(2024, 0, 15).getTime();
      const result = getDateTimeFromClockString('09:00', baseTimestamp);

      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(9);
      expect(resultDate.getMinutes()).toBe(0);
    });

    it('should handle midnight (00:00)', () => {
      const baseDate = new Date(2024, 0, 15);
      const result = getDateTimeFromClockString('00:00', baseDate);

      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(0);
      expect(resultDate.getMinutes()).toBe(0);
      expect(resultDate.getDate()).toBe(15);
    });

    it('should handle end of day (23:59)', () => {
      const baseDate = new Date(2024, 0, 15);
      const result = getDateTimeFromClockString('23:59', baseDate);

      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(23);
      expect(resultDate.getMinutes()).toBe(59);
      expect(resultDate.getDate()).toBe(15);
    });
  });

  describe('edge cases', () => {
    it('should handle single digit hours', () => {
      const baseDate = new Date(2024, 0, 15);
      const result = getDateTimeFromClockString('9:30', baseDate);

      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(9);
      expect(resultDate.getMinutes()).toBe(30);
    });

    it('should handle single digit minutes', () => {
      const baseDate = new Date(2024, 0, 15);
      const result = getDateTimeFromClockString('14:5', baseDate);

      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(14);
      expect(resultDate.getMinutes()).toBe(5);
    });

    it('should handle leading zeros', () => {
      const baseDate = new Date(2024, 0, 15);
      const result = getDateTimeFromClockString('09:05', baseDate);

      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(9);
      expect(resultDate.getMinutes()).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should throw for invalid clock string format', () => {
      const baseDate = new Date(2024, 0, 15);

      expect(() => getDateTimeFromClockString('invalid', baseDate)).toThrowError(
        'Invalid clock string',
      );
      expect(() => getDateTimeFromClockString('25:00', baseDate)).toThrowError(
        'Invalid clock string',
      );
      expect(() => getDateTimeFromClockString('12:60', baseDate)).toThrowError(
        'Invalid clock string',
      );
      expect(() => getDateTimeFromClockString('12-30', baseDate)).toThrowError(
        'Invalid clock string',
      );
      expect(() => getDateTimeFromClockString('', baseDate)).toThrowError(
        'Invalid clock string',
      );
    });
  });

  describe('timezone behavior', () => {
    it('should preserve local time interpretation', () => {
      // The clock string should be interpreted in local time
      const baseDate = new Date(2024, 0, 15, 12, 0, 0); // Noon
      const morningTime = getDateTimeFromClockString('08:00', baseDate);
      const eveningTime = getDateTimeFromClockString('20:00', baseDate);

      const morningDate = new Date(morningTime);
      const eveningDate = new Date(eveningTime);

      // Should be 8 AM and 8 PM in local time
      expect(morningDate.getHours()).toBe(8);
      expect(eveningDate.getHours()).toBe(20);

      // Both should be on the same day
      expect(morningDate.getDate()).toBe(15);
      expect(eveningDate.getDate()).toBe(15);
    });

    it('should overwrite existing time while preserving date', () => {
      // Start with a date that has a specific time
      const baseDate = new Date(2024, 0, 15, 14, 30, 45, 123);
      const result = getDateTimeFromClockString('09:00', baseDate);

      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(9);
      expect(resultDate.getMinutes()).toBe(0);
      expect(resultDate.getSeconds()).toBe(0);
      expect(resultDate.getMilliseconds()).toBe(0);

      // Date components should remain unchanged
      expect(resultDate.getFullYear()).toBe(2024);
      expect(resultDate.getMonth()).toBe(0);
      expect(resultDate.getDate()).toBe(15);
    });

    it('should work correctly across month boundaries', () => {
      // Last day of month
      const lastDay = new Date(2024, 0, 31, 12, 0, 0);
      const result = getDateTimeFromClockString('23:30', lastDay);

      const resultDate = new Date(result);
      expect(resultDate.getMonth()).toBe(0); // Still January
      expect(resultDate.getDate()).toBe(31); // Still 31st
      expect(resultDate.getHours()).toBe(23);
      expect(resultDate.getMinutes()).toBe(30);
    });

    it('should work correctly across year boundaries', () => {
      // New Year's Eve
      const newYearsEve = new Date(2023, 11, 31, 12, 0, 0);
      const result = getDateTimeFromClockString('23:59', newYearsEve);

      const resultDate = new Date(result);
      expect(resultDate.getFullYear()).toBe(2023);
      expect(resultDate.getMonth()).toBe(11); // December
      expect(resultDate.getDate()).toBe(31);
      expect(resultDate.getHours()).toBe(23);
      expect(resultDate.getMinutes()).toBe(59);
    });
  });

  describe('DST transitions', () => {
    it('should handle setting time during spring forward', () => {
      // March 10, 2024 - DST starts at 2 AM in many US timezones
      const dstDate = new Date(2024, 2, 10, 12, 0, 0);

      // Setting time to 1:30 AM (before DST)
      const beforeDst = getDateTimeFromClockString('01:30', dstDate);
      const beforeDate = new Date(beforeDst);
      expect(beforeDate.getHours()).toBe(1);
      expect(beforeDate.getMinutes()).toBe(30);

      // Setting time to 3:30 AM (after DST)
      const afterDst = getDateTimeFromClockString('03:30', dstDate);
      const afterDate = new Date(afterDst);
      expect(afterDate.getHours()).toBe(3);
      expect(afterDate.getMinutes()).toBe(30);
    });

    it('should handle setting time during fall back', () => {
      // November 3, 2024 - DST ends at 2 AM in many US timezones
      const dstDate = new Date(2024, 10, 3, 12, 0, 0);

      // The behavior here depends on the JavaScript engine and timezone
      // But the hours should always match what was requested
      const result = getDateTimeFromClockString('01:30', dstDate);
      const resultDate = new Date(result);
      expect(resultDate.getHours()).toBe(1);
      expect(resultDate.getMinutes()).toBe(30);
    });
  });

  describe('consistency checks', () => {
    it('should produce consistent results for same input', () => {
      const baseDate = new Date(2024, 0, 15);
      const time1 = getDateTimeFromClockString('14:30', baseDate);
      const time2 = getDateTimeFromClockString('14:30', baseDate);

      expect(time1).toBe(time2);
    });

    it('should maintain time order', () => {
      const baseDate = new Date(2024, 0, 15);
      const morning = getDateTimeFromClockString('08:00', baseDate);
      const noon = getDateTimeFromClockString('12:00', baseDate);
      const evening = getDateTimeFromClockString('20:00', baseDate);

      expect(morning).toBeLessThan(noon);
      expect(noon).toBeLessThan(evening);
    });

    it('should work with various clock formats consistently', () => {
      const baseDate = new Date(2024, 0, 15);

      // These should all represent 9:05 AM
      const withLeadingZeros = getDateTimeFromClockString('09:05', baseDate);
      const withoutLeadingZeros = getDateTimeFromClockString('9:5', baseDate);
      const mixedFormat = getDateTimeFromClockString('09:5', baseDate);

      const date1 = new Date(withLeadingZeros);
      const date2 = new Date(withoutLeadingZeros);
      const date3 = new Date(mixedFormat);

      expect(date1.getHours()).toBe(9);
      expect(date2.getHours()).toBe(9);
      expect(date3.getHours()).toBe(9);

      expect(date1.getMinutes()).toBe(5);
      expect(date2.getMinutes()).toBe(5);
      expect(date3.getMinutes()).toBe(5);
    });
  });
});
