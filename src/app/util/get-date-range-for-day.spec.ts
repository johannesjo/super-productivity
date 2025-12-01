import {
  getDateRangeForDay,
  rangeStartWithTime,
  rangeEndWithTime,
} from './get-date-range-for-day';

describe('getDateRangeForDay', () => {
  describe('basic functionality', () => {
    it('should return start and end timestamps for a given day', () => {
      // January 15, 2024 at noon
      const testDate = new Date(2024, 0, 15, 12, 0, 0).getTime();
      const result = getDateRangeForDay(testDate);

      const startDate = new Date(result.start);
      const endDate = new Date(result.end);

      // Start should be at midnight
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(startDate.getSeconds()).toBe(0);
      expect(startDate.getMilliseconds()).toBe(0);

      // End should be at 23:59:59
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
      expect(endDate.getMilliseconds()).toBe(0);

      // Should be the same day
      expect(startDate.getDate()).toBe(15);
      expect(endDate.getDate()).toBe(15);
    });
  });

  describe('rangeStartWithTime', () => {
    it('should set time to start of day (00:00:00.000)', () => {
      // Test with a date that has time
      const dateWithTime = new Date(2024, 0, 15, 14, 30, 45, 123).getTime();
      const result = rangeStartWithTime(dateWithTime);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);

      // Date should remain the same
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it('should handle dates already at start of day', () => {
      const startOfDay = new Date(2024, 0, 15, 0, 0, 0, 0).getTime();
      const result = rangeStartWithTime(startOfDay);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('rangeEndWithTime', () => {
    it('should set time to end of day (23:59:59.000)', () => {
      const dateWithTime = new Date(2024, 0, 15, 14, 30, 45, 123).getTime();
      const result = rangeEndWithTime(dateWithTime);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(0);

      // Date should remain the same
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it('should handle dates already at end of day', () => {
      const endOfDay = new Date(2024, 0, 15, 23, 59, 59, 0).getTime();
      const result = rangeEndWithTime(endOfDay);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('timezone behavior', () => {
    it('should use local timezone for day boundaries', () => {
      // This test verifies that day boundaries are in local time, not UTC
      const testDate = new Date(2024, 0, 15, 12, 0, 0).getTime();
      const { start, end } = getDateRangeForDay(testDate);

      const startDate = new Date(start);
      const endDate = new Date(end);

      // The day should be the same in local time
      expect(startDate.getDate()).toBe(15);
      expect(endDate.getDate()).toBe(15);

      // Hours should be local time
      expect(startDate.getHours()).toBe(0); // Local midnight
      expect(endDate.getHours()).toBe(23); // Local 23:59
    });

    it('should handle dates near midnight correctly', () => {
      // Test with 11:59 PM
      const nearMidnight = new Date(2024, 0, 15, 23, 59, 0).getTime();
      const { start, end } = getDateRangeForDay(nearMidnight);

      const startDate = new Date(start);
      const endDate = new Date(end);

      // Should still be the same day
      expect(startDate.getDate()).toBe(15);
      expect(endDate.getDate()).toBe(15);

      // Test with 12:01 AM
      const afterMidnight = new Date(2024, 0, 15, 0, 1, 0).getTime();
      const { start: start2, end: end2 } = getDateRangeForDay(afterMidnight);

      const startDate2 = new Date(start2);
      const endDate2 = new Date(end2);

      expect(startDate2.getDate()).toBe(15);
      expect(endDate2.getDate()).toBe(15);
    });

    it('should handle month boundaries correctly', () => {
      // Last day of January
      const lastDay = new Date(2024, 0, 31, 12, 0, 0).getTime();
      const { start, end } = getDateRangeForDay(lastDay);

      const startDate = new Date(start);
      const endDate = new Date(end);

      expect(startDate.getMonth()).toBe(0); // January
      expect(startDate.getDate()).toBe(31);
      expect(endDate.getMonth()).toBe(0); // January
      expect(endDate.getDate()).toBe(31);
    });

    it('should handle year boundaries correctly', () => {
      // December 31, 2023
      const newYearsEve = new Date(2023, 11, 31, 12, 0, 0).getTime();
      const { start, end } = getDateRangeForDay(newYearsEve);

      const startDate = new Date(start);
      const endDate = new Date(end);

      expect(startDate.getFullYear()).toBe(2023);
      expect(startDate.getMonth()).toBe(11); // December
      expect(startDate.getDate()).toBe(31);
      expect(endDate.getFullYear()).toBe(2023);
      expect(endDate.getMonth()).toBe(11);
      expect(endDate.getDate()).toBe(31);
    });
  });

  describe('DST transitions', () => {
    // Note: These tests verify the behavior during DST transitions
    // The actual behavior depends on the system timezone

    it('should handle spring forward (DST start)', () => {
      // March 10, 2024 - DST typically starts at 2 AM in US
      const dstStart = new Date(2024, 2, 10, 12, 0, 0).getTime();
      const { start, end } = getDateRangeForDay(dstStart);

      const startDate = new Date(start);
      const endDate = new Date(end);

      // Day boundaries should still be at local midnight/23:59
      expect(startDate.getHours()).toBe(0);
      expect(endDate.getHours()).toBe(23);

      // Should be a 23-hour day in DST-observing timezones
      const duration = end - start;
      const hours = duration / (1000 * 60 * 60);

      // In DST-observing timezones, this will be ~23 hours (actually 22.999...)
      // In non-DST timezones, this will be exactly 24 hours (actually 23.999...)
      // Allow for minor rounding due to 59:59 end time
      expect(hours).toBeGreaterThanOrEqual(22.999);
      expect(hours).toBeLessThanOrEqual(24);
    });

    it('should handle fall back (DST end)', () => {
      // November 3, 2024 - DST typically ends at 2 AM in US
      const dstEnd = new Date(2024, 10, 3, 12, 0, 0).getTime();
      const { start, end } = getDateRangeForDay(dstEnd);

      const startDate = new Date(start);
      const endDate = new Date(end);

      // Day boundaries should still be at local midnight/23:59
      expect(startDate.getHours()).toBe(0);
      expect(endDate.getHours()).toBe(23);

      // Should be a 25-hour day in DST-observing timezones
      const duration = end - start;
      const hours = duration / (1000 * 60 * 60);

      // In DST-observing timezones, this will be ~25 hours
      // In non-DST timezones, this will be exactly 24 hours
      // Allow for minor rounding errors (23.999... is essentially 24)
      expect(hours).toBeGreaterThanOrEqual(23.999);
      expect(hours).toBeLessThanOrEqual(25);
    });
  });

  describe('edge cases', () => {
    it('should handle very old dates', () => {
      const oldDate = new Date(1900, 0, 1, 12, 0, 0).getTime();
      const { start, end } = getDateRangeForDay(oldDate);

      const startDate = new Date(start);
      const endDate = new Date(end);

      expect(startDate.getFullYear()).toBe(1900);
      expect(startDate.getHours()).toBe(0);
      expect(endDate.getHours()).toBe(23);
    });

    it('should handle future dates', () => {
      const futureDate = new Date(2100, 0, 1, 12, 0, 0).getTime();
      const { start, end } = getDateRangeForDay(futureDate);

      const startDate = new Date(start);
      const endDate = new Date(end);

      expect(startDate.getFullYear()).toBe(2100);
      expect(startDate.getHours()).toBe(0);
      expect(endDate.getHours()).toBe(23);
    });

    it('should handle leap year dates', () => {
      // February 29, 2024
      const leapDay = new Date(2024, 1, 29, 12, 0, 0).getTime();
      const { start, end } = getDateRangeForDay(leapDay);

      const startDate = new Date(start);
      const endDate = new Date(end);

      expect(startDate.getMonth()).toBe(1); // February
      expect(startDate.getDate()).toBe(29);
      expect(endDate.getMonth()).toBe(1);
      expect(endDate.getDate()).toBe(29);
    });
  });
});
