export const formatISODateWithOffset = (date: Date): string => {
  const pad = (num, length = 2): string => String(num).padStart(length, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // Months are 0-indexed
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = pad(date.getMilliseconds(), 3); // Standard 3 digits

  // --- Timezone Offset Calculation ---
  const offsetMinutes = date.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
  const offsetMinPart = Math.abs(offsetMinutes % 60);
  // getTimezoneOffset returns POSITIVE for zones WEST of UTC, and NEGATIVE for EAST.
  // The standard ISO format requires the opposite sign (+ for EAST, - for WEST).
  const offsetSign = offsetMinutes <= 0 ? '+' : '-';
  const offsetFormatted = `${offsetSign}${pad(offsetHours)}:${pad(offsetMinPart)}`;
  // Special case for UTC (offset is 0) - some prefer 'Z'
  // const offsetFormatted = offsetMinutes === 0 ? 'Z' : `${offsetSign}${pad(offsetHours)}:${pad(offsetMinPart)}`;

  // --- Assemble the String ---
  // Using standard 3-digit milliseconds (.SSS)
  const formattedString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetFormatted}`;

  /*
  // If you strictly need 2-digit milliseconds (.SS), uncomment this:
  const millisecondsTwoDigits = milliseconds.substring(0, 2);
  formattedString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millisecondsTwoDigits}${offsetFormatted}`;
  */

  return formattedString;
};
