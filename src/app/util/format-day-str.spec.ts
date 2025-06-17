import { formatDayStr } from './format-day-str';

describe('formatDayStr', () => {
  it('should format day strings correctly with en-US locale', () => {
    expect(formatDayStr('2015-01-15', 'en-US')).toBe('Thu');
    expect(formatDayStr('2018-02-16', 'en-US')).toBe('Fri');
    expect(formatDayStr('2023-10-01', 'en-US')).toBe('Sun');
    expect(formatDayStr('2023-10-02', 'en-US')).toBe('Mon');
    expect(formatDayStr('2023-10-03', 'en-US')).toBe('Tue');
    expect(formatDayStr('2023-10-04', 'en-US')).toBe('Wed');
    expect(formatDayStr('2023-10-05', 'en-US')).toBe('Thu');
    expect(formatDayStr('2023-10-06', 'en-US')).toBe('Fri');
    expect(formatDayStr('2023-10-07', 'en-US')).toBe('Sat');
  });

  it('should format day strings with locale', () => {
    expect(formatDayStr('2023-01-15', 'en-US')).toBe('Sun');
    expect(formatDayStr('2023-01-16', 'en-US')).toBe('Mon');
    // Test different locale format if available
    expect(formatDayStr('2023-01-15', 'en-GB')).toBe('Sun');
    expect(formatDayStr('2023-01-16', 'en-GB')).toBe('Mon');
  });
});
