/**
 * Formats a date as day string with short date (e.g., 'Mon 15.1.')
 * @param dateStr - The date string in YYYY-MM-DD format
 * @returns The formatted day and date string
 */
export const formatDayMonthStr = (dateStr: string): string => {
  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${dayName} ${day}.${month}.`;
};
