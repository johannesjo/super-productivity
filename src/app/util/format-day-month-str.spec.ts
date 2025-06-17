import { formatDayMonthStr } from './format-day-month-str';

describe('formatDayMonthStr', () => {
  it('should format day and month strings correctly with en-US locale', () => {
    expect(formatDayMonthStr('2023-01-15', 'en-US')).toBe('Sun 1/15');
    expect(formatDayMonthStr('2023-02-16', 'en-US')).toBe('Thu 2/16');
    expect(formatDayMonthStr('2023-12-25', 'en-US')).toBe('Mon 12/25');
    expect(formatDayMonthStr('2023-10-01', 'en-US')).toBe('Sun 10/1');
    expect(formatDayMonthStr('2023-07-04', 'en-US')).toBe('Tue 7/4');
  });

  it('should format day and month strings with locale', () => {
    expect(formatDayMonthStr('2023-01-15', 'en-US')).toBe('Sun 1/15');
    expect(formatDayMonthStr('2023-02-16', 'en-US')).toBe('Thu 2/16');
    // Test that locale parameter is used for day names at least
    expect(formatDayMonthStr('2023-01-15', 'en-US')).toContain('Sun');
    expect(formatDayMonthStr('2023-02-16', 'en-US')).toContain('Thu');
  });
});
