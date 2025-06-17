/**
 * Format date according to moment-like format strings
 * Supports common formats used in the app
 */
export const formatDate = (date: Date | number | string, format: string): string => {
  const d = typeof date === 'object' ? date : new Date(date);

  if (isNaN(d.getTime())) {
    return '';
  }

  // Pad numbers with leading zeros
  const pad = (n: number, length = 2): string => n.toString().padStart(length, '0');

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  // Replace format tokens - order matters!
  return format
    .replace(/YYYY/g, year.toString())
    .replace(/YY/g, year.toString().slice(-2))
    .replace(/MMM/g, monthNames[month - 1]) // Must come before MM
    .replace(/MM/g, pad(month))
    .replace(/M/g, month.toString())
    .replace(/DD/g, pad(day))
    .replace(/D/g, day.toString())
    .replace(/HH/g, pad(hours))
    .replace(/H/g, hours.toString())
    .replace(/mm/g, pad(minutes))
    .replace(/m/g, minutes.toString())
    .replace(/ss/g, pad(seconds))
    .replace(/s/g, seconds.toString());
};
