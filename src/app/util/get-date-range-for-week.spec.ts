import {
  getDateFromWeekNr,
  getDateRangeForWeek,
  rangeEndWithTime,
  rangeStartWithTime,
} from './get-date-range-for-week';

describe('getDateRangeForWeek', () => {
  it('should return a valid range', () => {
    const result = getDateRangeForWeek(2020, 28);
    expect(result.rangeStart).toEqual(rangeStartWithTime(new Date(2020, 6, 6))); // July 6, 2020 local time
    expect(result.rangeEnd).toEqual(rangeEndWithTime(new Date(2020, 6, 12))); // July 12, 2020 local time
  });

  it('should return a valid range for last week of the year', () => {
    const result = getDateRangeForWeek(2020, 53);
    expect(result.rangeStart).toEqual(rangeStartWithTime(new Date(2020, 11, 28))); // December 28, 2020 local time
    expect(result.rangeEnd).toEqual(rangeEndWithTime(new Date(2021, 0, 3))); // January 3, 2021 local time
  });

  it('should return a valid value for first week of the year', () => {
    const result = getDateRangeForWeek(2021, 1);
    expect(result.rangeStart).toEqual(rangeStartWithTime(new Date(2021, 0, 4))); // January 4, 2021 local time
    expect(result.rangeEnd).toEqual(rangeEndWithTime(new Date(2021, 0, 10))); // January 10, 2021 local time
  });

  describe('timezone behavior', () => {
    it('should use local timezone for week boundaries', () => {
      const result = getDateRangeForWeek(2024, 10);

      // Check that start is at local midnight
      expect(result.rangeStart.getHours()).toBe(0);
      expect(result.rangeStart.getMinutes()).toBe(0);
      expect(result.rangeStart.getSeconds()).toBe(0);

      // Check that end is at local 23:59:59
      expect(result.rangeEnd.getHours()).toBe(23);
      expect(result.rangeEnd.getMinutes()).toBe(59);
      expect(result.rangeEnd.getSeconds()).toBe(59);
    });

    it('should handle weeks that cross month boundaries', () => {
      // Week 9 of 2024 spans from Feb 26 to Mar 3
      const result = getDateRangeForWeek(2024, 9);

      expect(result.rangeStart.getMonth()).toBe(1); // February (0-indexed)
      expect(result.rangeStart.getDate()).toBe(26);
      expect(result.rangeEnd.getMonth()).toBe(2); // March
      expect(result.rangeEnd.getDate()).toBe(3);
    });

    it('should handle weeks that cross year boundaries', () => {
      // Week 1 of 2024 starts on Jan 1, 2024
      const result = getDateRangeForWeek(2024, 1);

      expect(result.rangeStart.getFullYear()).toBe(2024);
      expect(result.rangeStart.getMonth()).toBe(0); // January
      expect(result.rangeStart.getDate()).toBe(1);

      // Week 53 of 2020 crosses into 2021
      const result2 = getDateRangeForWeek(2020, 53);
      expect(result2.rangeStart.getFullYear()).toBe(2020);
      expect(result2.rangeEnd.getFullYear()).toBe(2021);
    });

    it('should respect month parameter when provided', () => {
      // Week 10 of 2024 spans Mar 4-10, but we limit to March only
      const result = getDateRangeForWeek(2024, 10, 3); // March

      // Should start on Mar 4 (within March)
      expect(result.rangeStart.getMonth()).toBe(2); // March
      expect(result.rangeStart.getDate()).toBe(4);

      // Week that starts in February but ends in March
      const result2 = getDateRangeForWeek(2024, 9, 3); // Limit to March

      // Should start on Mar 1 (first day of March) instead of Feb 26
      expect(result2.rangeStart.getMonth()).toBe(2);
      expect(result2.rangeStart.getDate()).toBe(1);
    });
  });

  describe('getDateFromWeekNr', () => {
    it('should calculate ISO week start dates correctly', () => {
      // ISO weeks start on Monday
      // Week 1 is the week with the first Thursday of the year

      // 2024 week 1 starts on Monday, Jan 1
      const week1_2024 = getDateFromWeekNr(2024, 1);
      expect(week1_2024.getDay()).toBe(1); // Monday
      expect(week1_2024.getDate()).toBe(1);

      // 2023 week 1 starts on Monday, Jan 2
      const week1_2023 = getDateFromWeekNr(2023, 1);
      expect(week1_2023.getDay()).toBe(1); // Monday
      expect(week1_2023.getDate()).toBe(2);
    });

    it('should handle edge cases around year boundaries', () => {
      // 2021 starts on Friday, so week 1 starts on Jan 4 (Monday)
      const week1_2021 = getDateFromWeekNr(2021, 1);
      expect(week1_2021.getFullYear()).toBe(2021);
      expect(week1_2021.getMonth()).toBe(0);
      expect(week1_2021.getDate()).toBe(4);
      expect(week1_2021.getDay()).toBe(1); // Monday
    });
  });

  describe('rangeStartWithTime and rangeEndWithTime', () => {
    it('should set correct time boundaries', () => {
      const testDate = new Date(2024, 2, 15, 14, 30, 45, 123);

      const start = rangeStartWithTime(testDate);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
      expect(start.getDate()).toBe(15);

      const end = rangeEndWithTime(testDate);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(0);
      expect(end.getDate()).toBe(15);
    });

    it('should create new date objects', () => {
      const original = new Date(2024, 2, 15, 14, 30);
      const start = rangeStartWithTime(original);
      const end = rangeEndWithTime(original);

      // Should be different objects
      expect(start).not.toBe(original);
      expect(end).not.toBe(original);

      // Original should be unchanged
      expect(original.getHours()).toBe(14);
      expect(original.getMinutes()).toBe(30);
    });
  });

  describe('DST transitions', () => {
    it('should handle week containing spring forward', () => {
      // Week 11 of 2024 contains March 10 (DST starts in US)
      const result = getDateRangeForWeek(2024, 11);

      // Should still have proper day boundaries
      expect(result.rangeStart.getHours()).toBe(0);
      expect(result.rangeEnd.getHours()).toBe(23);

      // Week should be 7 days despite DST
      const days =
        (result.rangeEnd.getTime() - result.rangeStart.getTime()) / (1000 * 60 * 60 * 24);
      // The difference is almost 7 days (6.999...) because end time is 23:59:59
      expect(Math.round(days)).toBe(7);
    });

    it('should handle week containing fall back', () => {
      // Week 45 of 2024 contains November 3 (DST ends in US)
      const result = getDateRangeForWeek(2024, 45);

      // Should still have proper day boundaries
      expect(result.rangeStart.getHours()).toBe(0);
      expect(result.rangeEnd.getHours()).toBe(23);

      // Week should be 7 days despite DST
      const days =
        (result.rangeEnd.getTime() - result.rangeStart.getTime()) / (1000 * 60 * 60 * 24);
      // The difference is almost 7 days (6.999...) because end time is 23:59:59
      expect(Math.round(days)).toBe(7);
    });
  });
});
