import { getWeekNumber } from './get-week-number';

describe('getWeekNumber()', () => {
  it('should return valid value', () => {
    const d = new Date('2020-07-06');
    const result = getWeekNumber(d);
    expect(result).toBe(28);
  });

  it('should return a valid value for first of the year', () => {
    const d = new Date('2020-01-01');
    const result = getWeekNumber(d);
    expect(result).toBe(1);
  });

  it('should return a valid value for 2020-01-08 based on first day of week', () => {
    let d = new Date('2020-01-08');
    let result = getWeekNumber(d);
    expect(result).toBe(2);

    d = new Date('2020-01-08');
    result = getWeekNumber(d, 6);
    expect(result).toBe(1);
  });

  it('should return a valid value for last of the year', () => {
    const d = new Date('2020-12-31');
    const result = getWeekNumber(d);
    expect(result).toBe(53);
  });

  it('should return a valid value for last of the year', () => {
    const d = new Date('2021-12-31');
    const result = getWeekNumber(d);
    expect(result).toBe(52);
  });
});
