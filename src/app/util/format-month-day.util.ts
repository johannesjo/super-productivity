import { DatePipe } from '@angular/common';

/**
 * Formats a date to show only month and day in locale-aware format.
 * Uses Angular's DatePipe for consistent formatting with the rest of the app.
 *
 * Examples by locale:
 * - en-US: "12/25" (month/day)
 * - en-GB: "25/12" (day/month)
 * - de-DE: "25.12" (day.month)
 * - ja-JP: "12/25" (month/day, year removed from start)
 *
 * @param date The date to format
 * @param locale The locale string (e.g., 'en-US', 'de-DE')
 * @returns Formatted month/day string, or empty string if formatting fails
 */
export const formatMonthDay = (date: Date, locale: string): string => {
  try {
    // Validate the date first
    if (!date || isNaN(date.getTime())) {
      return '';
    }

    const datePipe = new DatePipe(locale);

    // Use Angular's DatePipe for consistent formatting with the rest of the app
    // 'shortDate' format will automatically adapt to the locale (M/d/yy for en-US, dd/MM/yy for en-GB, etc.)
    const shortDate = datePipe.transform(date, 'shortDate') || '';

    // Remove year from various locale formats:
    // en-US: "12/25/23" -> "12/25"
    // en-GB: "25/12/2023" -> "25/12"
    // de-DE: "25.12.23" -> "25.12"
    // fr-FR: "25/12/2023" -> "25/12"
    // ja-JP: "2023/12/25" -> "12/25" (special case - remove year from start)
    // ko-KR: "23. 12. 25." -> "12. 25."

    // Handle year at the end (most common): separator + 2-4 digits
    let result = shortDate.replace(/[/.\-\s]+\d{2,4}\.?$/, '');

    // Handle year at the beginning (like Japanese): 4 digits + separator
    result = result.replace(/^\d{4}[/.\-\s]+/, '');

    return result;
  } catch (error) {
    // Fallback to basic formatting if locale data is missing
    console.warn(`formatMonthDay failed for locale ${locale}:`, error);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }
};
