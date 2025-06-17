import { formatDayStr } from './format-day-str';

describe('formatDayStr', () => {
  it('should format day strings correctly', () => {
    expect(formatDayStr('2015-01-15')).toBe('Thu');
    expect(formatDayStr('2018-02-16')).toBe('Fri');
    expect(formatDayStr('2023-10-01')).toBe('Sun');
    expect(formatDayStr('2023-10-02')).toBe('Mon');
    expect(formatDayStr('2023-10-03')).toBe('Tue');
    expect(formatDayStr('2023-10-04')).toBe('Wed');
    expect(formatDayStr('2023-10-05')).toBe('Thu');
    expect(formatDayStr('2023-10-06')).toBe('Fri');
    expect(formatDayStr('2023-10-07')).toBe('Sat');
  });
});
