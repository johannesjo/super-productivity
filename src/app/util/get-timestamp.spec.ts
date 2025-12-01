import { getTimestamp } from './get-timestamp';

describe('getTimestamp', () => {
  it('should convert valid date string to timestamp', () => {
    const result = getTimestamp('2024-01-15T10:30:00');
    expect(result).toBe(new Date(2024, 0, 15, 10, 30, 0).getTime());
  });

  it('should handle ISO 8601 date strings', () => {
    const result = getTimestamp('2024-01-15T10:30:00.000Z');
    expect(result).toBe(new Date('2024-01-15T10:30:00.000Z').getTime());
  });

  it('should handle date with timezone offset', () => {
    const result = getTimestamp('2024-01-15T10:30:00+02:00');
    expect(result).toBe(new Date('2024-01-15T10:30:00+02:00').getTime());
  });

  it('should handle date-only format', () => {
    // Native Date parses date-only strings as UTC midnight
    const dateStr = '2024-01-15';
    const result = getTimestamp(dateStr);

    // This is how native Date parses date-only strings
    expect(result).toBe(new Date(dateStr).getTime());
  });

  it('should return NaN for invalid date strings', () => {
    const result = getTimestamp('invalid-date');
    expect(result).toBeNaN();
  });
});
