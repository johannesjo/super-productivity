/** Represents a range of a week, including start and end dates */
export interface WeekRange {
  /** Start date of the week */
  start: Date;
  /** End date of the week */
  end: Date;
}

/**
 * Calculates the start and end dates of a week based on a given date and a specified starting day of the week.
 *
 * @param relativeDate - The date relative to which the weekly range is calculated.
 * @param firstDayOfWeek - The day of the week that defines the start of the week (0 = Sunday, 1 = Monday, etc.).
 * @returns An object containing the start and end dates of the week.
 */
export const getWeekRange = (relativeDate: Date, firstDayOfWeek: number): WeekRange => {
  const date = new Date(relativeDate); // Create a copy of the input date
  const dayOfWeek = date.getDay(); // Get the current day of the week (0-6)

  const startOfWeek = new Date(date); // Initialize starting date of the week
  const endOfWeek = new Date(date); // Initialize ending date of the week

  // Calculate the shift to determine the start of the week
  const shift =
    dayOfWeek < firstDayOfWeek
      ? dayOfWeek + 7 - firstDayOfWeek // If current day is before the start day
      : dayOfWeek - firstDayOfWeek; // If current day is on or after the start day

  // Adjust the startOfWeek to the calculated date and set to midnight
  startOfWeek.setDate(date.getDate() - shift);
  startOfWeek.setHours(0, 0, 0, 0);

  // Adjust the endOfWeek to 6 days after the startOfWeek and set to end of the day
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    start: startOfWeek, // Return start date of the week
    end: endOfWeek, // Return end date of the week
  };
};
