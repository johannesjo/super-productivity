import { dateStrToUtcDate } from './date-str-to-utc-date';

/**
 * Formats a date as a short day string (e.g., 'Mon', 'Tue', etc.)
 * @param dateStr - The date string in YYYY-MM-DD format
 * @param locale - The locale string (e.g., 'en-US', 'de-DE')
 * @returns The abbreviated day name in the specified locale
 */
export const formatDayStr = (dateStr: string, locale: string): string => {
  const date = dateStrToUtcDate(dateStr);
  return date.toLocaleDateString(locale, { weekday: 'short' });
};
