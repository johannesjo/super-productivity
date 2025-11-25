//  Normalize a date (or ISO datetime) string to a local start-of-day Date
// to avoid timezone offset drift (e.g., DST differences between UTC and local midnight).
// example use case:
/*
getDateTimeFromClockString(
      workStartEndCfg.startTime,
      dateStrToUtcDate(dayDate),
)

^ this would produce wrong day if the timezone offset is negative, if we were not using dateStrToUtcDate
 */
// This utility function converts a 'YYYY-MM-DD' date string into a JavaScript Date object
// that represents the start of that day (00:00:00) in the *local timezone* of the system.
// This is crucial for consistent date arithmetic and display, as it avoids issues that arise
// when parsing 'YYYY-MM-DD' strings as UTC and then applying local offsets, especially around
// Daylight Saving Time (DST) transitions.
export const dateStrToUtcDate = (dateStr: string): Date => {
  if (!dateStr) {
    // If no date string is provided, return a Date object for the current moment.
    return new Date();
  }

  // Split the date string into year, month, and day components.
  const parts = dateStr.split('-');
  // Ensure the string is in the expected 'YYYY-MM-DD' format.
  if (parts.length !== 3) {
    return new Date('Invalid Date');
  }

  // Convert string parts to numbers.
  const [year, month, day] = parts.map((v) => +v);

  // Validate that all components are valid numbers.
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date('Invalid Date');
  }

  // Create a new Date object using the local time constructor (year, monthIndex, day).
  // The month is 0-indexed in JavaScript Date objects, so we subtract 1.
  // This approach correctly accounts for the local system's timezone and DST rules
  // to pinpoint the exact local midnight (or start of day).
  const date = new Date(year, month - 1, day);

  // Perform a "rollover" check to ensure the date components haven't changed due to invalid
  // input (e.g., new Date(2024, 12, 1) would roll over to Jan 1, 2025).
  // This maintains stricter parsing behavior similar to new Date('YYYY-MM-DD') for invalid dates.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date('Invalid Date');
  }

  return date;
};
