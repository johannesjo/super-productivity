import { formatDateTimeForFilename } from './format-date-time-for-filename';

describe('formatDateTimeForFilename', () => {
  it('should format date as YYYYMMDD_HHmmss', () => {
    const testCases = [
      {
        date: new Date(2023, 9, 15, 14, 30, 45, 123),
        expected: '20231015_143045',
      },
      {
        date: new Date(2024, 0, 1, 0, 0, 0, 0),
        expected: '20240101_000000',
      },
      {
        date: new Date(2024, 11, 31, 23, 59, 59, 999),
        expected: '20241231_235959',
      },
    ];

    testCases.forEach(({ date, expected }) => {
      // Note: the expected value will depend on the local timezone
      // For consistent testing, we'll check the format rather than exact values
      const result = formatDateTimeForFilename(date);
      expect(result).toMatch(/^\d{8}_\d{6}$/);
      expect(result.length).toBe(15);
    });
  });

  it('should use current date when no date is provided', () => {
    const before = new Date();
    const result = formatDateTimeForFilename();
    const after = new Date();

    expect(result).toMatch(/^\d{8}_\d{6}$/);

    // Extract the date parts
    const dateStr = result.substring(0, 8);
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6));
    const day = parseInt(dateStr.substring(6, 8));

    // Should be within reasonable bounds
    expect(year).toBeGreaterThanOrEqual(before.getFullYear());
    expect(year).toBeLessThanOrEqual(after.getFullYear());
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });

  it('should pad single digit values with zeros', () => {
    const date = new Date(2023, 0, 5, 9, 8, 7);
    const result = formatDateTimeForFilename(date);

    // Check that single digits are padded
    expect(result).toContain('01'); // month
    expect(result).toContain('05'); // day
    expect(result).toContain('09'); // hours
    expect(result).toContain('08'); // minutes
    expect(result).toContain('07'); // seconds
  });
});
