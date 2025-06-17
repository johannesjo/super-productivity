import { formatDayMonthStr } from './format-day-month-str';

describe('formatDayMonthStr', () => {
  it('should format day and month strings correctly', () => {
    expect(formatDayMonthStr('2023-01-15')).toBe('Sun 15.1.');
    expect(formatDayMonthStr('2023-02-16')).toBe('Thu 16.2.');
    expect(formatDayMonthStr('2023-12-25')).toBe('Mon 25.12.');
    expect(formatDayMonthStr('2023-10-01')).toBe('Sun 1.10.');
    expect(formatDayMonthStr('2023-07-04')).toBe('Tue 4.7.');
  });
});
