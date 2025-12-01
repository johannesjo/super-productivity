import { getWeekNumber } from './get-week-number';

describe('getWeekNumber()', () => {
  it('should return valid value', () => {
    const d = new Date(2020, 6, 6); // July 6, 2020 local time (month is 0-indexed)
    const result = getWeekNumber(d);
    expect(result).toBe(28);
  });

  it('should return a valid value for first of the year', () => {
    const d = new Date(2020, 0, 1); // January 1, 2020 local time
    const result = getWeekNumber(d);
    expect(result).toBe(1);
  });

  it('should return a valid value for 2020-01-08 based on first day of week', () => {
    let d = new Date(2020, 0, 8); // January 8, 2020 local time
    let result = getWeekNumber(d);
    expect(result).toBe(2);

    d = new Date(2020, 0, 8); // January 8, 2020 local time
    result = getWeekNumber(d, 6);
    expect(result).toBe(1);
  });

  it('should return a valid value for last of the year', () => {
    const d = new Date(2020, 11, 31); // December 31, 2020 local time
    const result = getWeekNumber(d);
    expect(result).toBe(53);
  });

  it('should return a valid value for last of the year', () => {
    const d = new Date(2021, 11, 31); // December 31, 2021 local time
    const result = getWeekNumber(d);
    expect(result).toBe(52);
  });
});
