/**
 * Formats a timestamp or Date as HH:mm
 * @param dateOrTimestamp - The Date object or timestamp to format
 * @returns The formatted time string
 */
export const formatTimeHHmm = (dateOrTimestamp: Date | number): string => {
  const date =
    dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};
