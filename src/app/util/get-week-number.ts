export const getWeekNumber = (d: Date, firstDayOfWeek: number = 1): number => {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // d = new Date(d);
  // Set to nearest middle of week based on first day of
  // week (if first day of week is default it will be Thursday):
  // current date + 4 - current day number
  // Make end of week day number 7
  const diff = (7 - (firstDayOfWeek - 1)) % 7;
  d.setUTCDate(d.getUTCDate() + 4 - ((d.getUTCDay() + diff) % 7 || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest middle of week
  // prettier-ignore
  const weekNo = Math.ceil((((+d - +yearStart) / 86400000) + 1) / 7);
  // Return array of year and week number
  // return [d.getUTCFullYear(), weekNo];

  return weekNo;
};
