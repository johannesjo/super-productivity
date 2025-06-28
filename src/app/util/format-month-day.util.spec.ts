import { formatMonthDay } from './format-month-day.util';

describe('formatMonthDay', () => {
  const testDate = new Date(2023, 11, 25); // December 25, 2023

  it('should format dates for US locale', () => {
    const result = formatMonthDay(testDate, 'en-US');
    expect(result).toBe('12/25');
  });

  it('should return empty string for invalid dates', () => {
    const result = formatMonthDay(new Date('invalid'), 'en-US');
    expect(result).toBe('');
  });

  it('should return empty string for null dates', () => {
    const result = formatMonthDay(null as any, 'en-US');
    expect(result).toBe('');
  });

  it('should handle different year formats', () => {
    // Test that both 2-digit and 4-digit years are properly removed
    const result = formatMonthDay(testDate, 'en-US');
    expect(result).not.toContain('23');
    expect(result).not.toContain('2023');
  });

  it('should fallback to basic format when locale data is missing', () => {
    // Use a non-existent locale to trigger fallback
    const result = formatMonthDay(testDate, 'xx-XX');
    expect(result).toBe('12/25'); // Should fallback to M/d format
  });

  it('should handle single digit months and days', () => {
    const result = formatMonthDay(new Date(2023, 0, 5), 'en-US'); // January 5, 2023
    expect(result).toBe('1/5');
  });
});
