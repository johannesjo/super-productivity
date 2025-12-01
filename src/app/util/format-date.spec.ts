import { formatDate } from './format-date';

describe('formatDate', () => {
  it('should format date with HH:mm format', () => {
    const date = new Date(2024, 0, 15, 14, 30, 0);
    expect(formatDate(date, 'HH:mm')).toBe('14:30');
  });

  it('should format date with different formats', () => {
    const date = new Date(2024, 0, 15, 14, 30, 45);
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
    expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2024');
    expect(formatDate(date, 'MMM D, YYYY')).toBe('Jan 15, 2024');
  });

  it('should handle single digit values', () => {
    const date = new Date(2024, 0, 5, 9, 5, 5);
    expect(formatDate(date, 'YYYY-M-D')).toBe('2024-1-5');
    expect(formatDate(date, 'H:m:s')).toBe('9:5:5');
  });

  it('should handle timestamps', () => {
    const timestamp = new Date(2024, 0, 15, 14, 30, 0).getTime();
    expect(formatDate(timestamp, 'HH:mm')).toBe('14:30');
  });

  it('should handle string dates', () => {
    expect(formatDate('2024-01-15T14:30:00', 'HH:mm')).toBe('14:30');
  });

  it('should return empty string for invalid dates', () => {
    expect(formatDate('invalid', 'HH:mm')).toBe('');
    expect(formatDate(NaN, 'HH:mm')).toBe('');
  });

  it('should handle midnight correctly', () => {
    const date = new Date(2024, 0, 15, 0, 0, 0);
    expect(formatDate(date, 'HH:mm')).toBe('00:00');
  });

  it('should handle noon correctly', () => {
    const date = new Date(2024, 0, 15, 12, 0, 0);
    expect(formatDate(date, 'HH:mm')).toBe('12:00');
  });
});
