/**
 * Get minimum weekday names for a locale
 * @param locale - The locale to use (defaults to browser locale)
 * @returns Array of minimal weekday names starting from Sunday
 */
export const getWeekdaysMin = (locale?: string): string[] => {
  const weekdays: string[] = [];
  const baseDate = new Date(2023, 0, 1); // January 1, 2023 is a Sunday

  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    // Using 'narrow' format to get minimal weekday names (e.g., 'S', 'M', 'T', etc.)
    // If narrow is too short, we can use 'short' instead
    const weekdayName = date.toLocaleDateString(locale || undefined, {
      weekday: 'short',
    });
    // Take first 2 characters to match moment's weekdaysMin behavior
    weekdays.push(weekdayName.substring(0, 2));
  }

  return weekdays;
};
