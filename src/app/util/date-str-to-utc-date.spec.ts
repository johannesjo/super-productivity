import { dateStrToUtcDate } from './date-str-to-utc-date';

describe('dateStrToUtcDate', () => {
  describe('basic functionality', () => {
    it('should parse date string correctly', () => {
      const result = dateStrToUtcDate('2024-01-15');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(15);
    });

    it('should handle leap year', () => {
      const result = dateStrToUtcDate('2024-02-29');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1); // February is 1
      expect(result.getDate()).toBe(29);
    });

    it('should handle year boundaries', () => {
      const dec31 = dateStrToUtcDate('2023-12-31');
      expect(dec31.getFullYear()).toBe(2023);
      expect(dec31.getMonth()).toBe(11); // December is 11
      expect(dec31.getDate()).toBe(31);

      const jan1 = dateStrToUtcDate('2024-01-01');
      expect(jan1.getFullYear()).toBe(2024);
      expect(jan1.getMonth()).toBe(0); // January is 0
      expect(jan1.getDate()).toBe(1);
    });
  });

  describe('timezone consistency', () => {
    // These tests verify that the date doesn't shift due to timezone issues
    const testDates = [
      '2024-01-01', // New Year
      '2024-12-31', // New Year's Eve
      '2024-06-21', // Summer solstice
      '2024-12-21', // Winter solstice
      '2024-03-10', // DST start in US
      '2024-11-03', // DST end in US
      '2025-06-26', // Issue #4653 example date
    ];

    testDates.forEach((dateStr) => {
      it(`should maintain correct date for ${dateStr} regardless of timezone`, () => {
        const result = dateStrToUtcDate(dateStr);
        const [year, month, day] = dateStr.split('-').map(Number);

        expect(result.getFullYear()).toBe(year);
        expect(result.getMonth()).toBe(month - 1); // JS months are 0-indexed
        expect(result.getDate()).toBe(day);
      });
    });

    it('should handle all days of a month correctly', () => {
      // Test all days in February 2024 (leap year)
      for (let day = 1; day <= 29; day++) {
        const dateStr = `2024-02-${day.toString().padStart(2, '0')}`;
        const result = dateStrToUtcDate(dateStr);
        expect(result.getDate()).toBe(day);
        expect(result.getMonth()).toBe(1); // February
        expect(result.getFullYear()).toBe(2024);
      }
    });
  });

  describe('comparison with native Date constructor', () => {
    it('should produce different results than new Date() for negative timezone offsets', () => {
      const dateStr = '2024-01-15';
      const nativeDate = new Date(dateStr);
      const utilDate = dateStrToUtcDate(dateStr);

      // In negative timezone offsets (e.g., PST), native Date might show previous day
      // Our utility should always show the correct day
      expect(utilDate.getDate()).toBe(15);

      // Log for debugging in different timezones
      console.log('Timezone test:', {
        dateStr,
        nativeDate: nativeDate.toString(),
        utilDate: utilDate.toString(),
        nativeDateNum: nativeDate.getDate(),
        utilDateNum: utilDate.getDate(),
        timezoneOffset: new Date().getTimezoneOffset(),
      });
    });
  });

  describe('ISO datetime inputs', () => {
    const isoTestCases = [
      '2024-01-15T00:00:00Z',
      '2024-06-21T23:30:00-11:00',
      '2024-03-10T07:30:00Z', // US DST start day
      '2024-12-21T12:00:00+05:30',
      '2024-1-5T12:00:00Z', // single-digit month/day
    ];

    isoTestCases.forEach((dateStr) => {
      it(`should parse ISO datetime string ${dateStr} and keep calendar day`, () => {
        const result = dateStrToUtcDate(dateStr);
        const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);

        expect(result.getFullYear()).toBe(year);
        expect(result.getMonth()).toBe(month - 1);
        expect(result.getDate()).toBe(day);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
      });
    });

    it('should return Invalid Date for malformed ISO string', () => {
      (window.confirm as jasmine.Spy).and.returnValue(false);
      expect(dateStrToUtcDate('2024/01/15T00:00:00Z').toString()).toBe('Invalid Date');
    });
  });

  describe('edge cases', () => {
    it('should handle month boundaries correctly', () => {
      const testCases = [
        { date: '2024-01-31', expectedDay: 31 },
        { date: '2024-02-01', expectedDay: 1 },
        { date: '2024-04-30', expectedDay: 30 },
        { date: '2024-05-01', expectedDay: 1 },
        { date: '2024-12-31', expectedDay: 31 },
        { date: '2025-01-01', expectedDay: 1 },
      ];

      testCases.forEach(({ date, expectedDay }) => {
        const result = dateStrToUtcDate(date);
        expect(result.getDate()).toBe(expectedDay);
      });
    });

    it('should handle different date formats', () => {
      // Test that it works with various YYYY-MM-DD format variations
      expect(() => dateStrToUtcDate('2024-1-15')).not.toThrow();
      expect(() => dateStrToUtcDate('2024-01-5')).not.toThrow();
      expect(() => dateStrToUtcDate('2024-1-5')).not.toThrow();
    });

    it('should return Invalid Date for invalid inputs', () => {
      (window.confirm as jasmine.Spy).and.returnValue(false);
      expect(dateStrToUtcDate('invalid-date').toString()).toBe('Invalid Date');
      expect(dateStrToUtcDate('2024-13-01').toString()).toBe('Invalid Date'); // Invalid month
      expect(dateStrToUtcDate('2024-01-32').toString()).toBe('Invalid Date'); // Invalid day
    });
  });

  describe('time component', () => {
    it('should set time to start of day in local timezone', () => {
      const result = dateStrToUtcDate('2024-01-15');
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });
});
