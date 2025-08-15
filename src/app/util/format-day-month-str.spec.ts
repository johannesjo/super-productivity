import { formatDayMonthStr } from './format-day-month-str';

describe('formatDayMonthStr', () => {
  it('should format day and month strings correctly with en-US locale', () => {
    const result1 = formatDayMonthStr('2023-01-15', 'en-US');
    expect(result1).toBe('Sun 1/15');

    const result2 = formatDayMonthStr('2023-02-16', 'en-US');
    expect(result2).toBe('Thu 2/16');

    const result3 = formatDayMonthStr('2023-12-25', 'en-US');
    expect(result3).toBe('Mon 12/25');

    const result4 = formatDayMonthStr('2023-10-01', 'en-US');
    expect(result4).toBe('Sun 10/1');

    const result5 = formatDayMonthStr('2023-07-04', 'en-US');
    expect(result5).toBe('Tue 7/4');
  });

  it('should format day and month strings with locale', () => {
    const result1 = formatDayMonthStr('2023-01-15', 'en-US');
    const result2 = formatDayMonthStr('2023-02-16', 'en-US');

    // Test that locale parameter is used for day names at least
    expect(result1).toBe('Sun 1/15');
    expect(result2).toBe('Thu 2/16');

    // Test format includes date
    expect(result1).toContain('1/15');
    expect(result2).toContain('2/16');
  });

  describe('timezone edge cases', () => {
    // These tests verify the fix for issue #4653
    const criticalTestCases = [
      {
        date: '2025-06-26',
        expectedUS: 'Thu 6/26',
        description: 'Issue #4653 - day of week mismatch',
      },
      {
        date: '2024-01-01',
        expectedUS: 'Mon 1/1',
        description: 'New Year 2024',
      },
      {
        date: '2024-12-31',
        expectedUS: 'Tue 12/31',
        description: 'New Year Eve 2024',
      },
      {
        date: '2024-02-29',
        expectedUS: 'Thu 2/29',
        description: 'Leap year day',
      },
    ];

    criticalTestCases.forEach(({ date, expectedUS, description }) => {
      it(`should format ${date} correctly (${description})`, () => {
        const result = formatDayMonthStr(date, 'en-US');
        expect(result).toBe(expectedUS);
      });
    });

    // Test month boundaries that could be problematic with timezone issues
    const monthBoundaries = [
      { date: '2024-01-31', expectedUS: 'Wed 1/31' },
      { date: '2024-02-01', expectedUS: 'Thu 2/1' },
      { date: '2024-04-30', expectedUS: 'Tue 4/30' },
      { date: '2024-05-01', expectedUS: 'Wed 5/1' },
      { date: '2024-08-31', expectedUS: 'Sat 8/31' },
      { date: '2024-09-01', expectedUS: 'Sun 9/1' },
    ];

    monthBoundaries.forEach(({ date, expectedUS }) => {
      it(`should handle month boundary ${date} correctly`, () => {
        const result = formatDayMonthStr(date, 'en-US');
        expect(result).toBe(expectedUS);
      });
    });
  });

  describe('different locales', () => {
    it('should format with US locale consistently', () => {
      expect(formatDayMonthStr('2024-01-15', 'en-US')).toBe('Mon 1/15');
      expect(formatDayMonthStr('2024-12-25', 'en-US')).toBe('Wed 12/25');
    });

    // throws with wallaby :(
    // it('should handle locale-specific formatting', () => {
    //   // Test that function accepts different locales without throwing
    //   expect(() => formatDayMonthStr('2024-01-15', 'en-GB')).not.toThrow();
    //   expect(() => formatDayMonthStr('2024-01-15', 'fr-FR')).not.toThrow();
    // });
  });

  describe('year removal', () => {
    it('should not contain year in formatted output', () => {
      const result = formatDayMonthStr('2024-01-15', 'en-US');
      expect(result).not.toContain('2024');
      expect(result).not.toContain('24');
    });
  });
});
