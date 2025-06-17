/**
 * Formats a date as a short day string (e.g., 'Mon', 'Tue', etc.)
 * @param dateStr - The date string in YYYY-MM-DD format
 * @returns The abbreviated day name
 */
export const formatDayStr = (dateStr: string): string => {
  const date = new Date(dateStr);
  // Using toLocaleDateString with 'en-US' locale to get consistent day abbreviations
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};
