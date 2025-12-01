/**
 * Formats a date as YYYYMMDD_HHmmss for use in file names
 * @param date - The date to format (defaults to current date)
 * @returns The formatted date string
 */
export const formatDateTimeForFilename = (date: Date = new Date()): string => {
  const pad = (num: number): string => String(num).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
};
