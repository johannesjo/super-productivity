import { DatePipe } from '@angular/common';
import { dateStrToUtcDate } from './date-str-to-utc-date';

/**
 * Formats a date as day string with short date in locale-aware format
 * @param dateStr - The date string in YYYY-MM-DD format
 * @param locale - The locale string (e.g., 'en-US', 'de-DE')
 * @returns The formatted day and date string in the specified locale
 */
export const formatDayMonthStr = (dateStr: string, locale: string): string => {
  const date = dateStrToUtcDate(dateStr);
  const dayName = date.toLocaleDateString(locale, { weekday: 'short' });

  // Use Angular's DatePipe for locale-aware date formatting
  const datePipe = new DatePipe(locale);
  const shortDate = datePipe.transform(date, 'shortDate') || '';

  // Remove year from the date (same logic as formatMonthDay)
  let dateOnly = shortDate.replace(/[/.\-\s]+\d{2,4}\.?$/, '');
  dateOnly = dateOnly.replace(/^\d{4}[/.\-\s]+/, '');

  return `${dayName} ${dateOnly}`;
};
