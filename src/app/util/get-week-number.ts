export const getWeekNumber = (d: Date): number => {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  // prettier-ignore
  const weekNo = Math.ceil((((+d - +yearStart) / 86400000) + 1) / 7);
  // Return array of year and week number
  // return [d.getUTCFullYear(), weekNo];
  return weekNo;
};
