import { Worklog } from '../worklog.model';

/**
 * Retrieves the total time spent (in milliseconds) for a given day from the worklog.
 * Returns undefined if the day is not present in the worklog.
 */
export const getTimeSpentForDay = (
  worklog: Worklog,
  dayStr: string,
): number | undefined => {
  if (!worklog || !dayStr) {
    return undefined;
  }

  const [yearStr, monthStr, dayOfMonthStr] = dayStr.split('-');
  if (!yearStr || !monthStr || !dayOfMonthStr) {
    return undefined;
  }

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const dayOfMonth = parseInt(dayOfMonthStr, 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(dayOfMonth)) {
    return undefined;
  }

  const yearEntry = worklog[year];
  if (!yearEntry) {
    return undefined;
  }

  const monthEntry = yearEntry.ent?.[month];
  if (!monthEntry) {
    return undefined;
  }

  const dayEntry = monthEntry.ent?.[dayOfMonth];
  if (!dayEntry) {
    return undefined;
  }

  return dayEntry.timeSpent;
};
