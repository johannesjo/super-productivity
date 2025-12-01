// Normalize a date (or ISO datetime) string to a local start-of-day Date
// to avoid offset drift (e.g., DST differences between UTC and local midnight).
import { devError } from './dev-error';

export const dateStrToUtcDate = (dateStr: string): Date => {
  if (!dateStr) {
    return new Date();
  }

  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(dateStr);
  if (!match) {
    devError(`dateStrToUtcDate: invalid date string: ${dateStr}`);
    return new Date('Invalid Date');
  }

  const [, yearStr, monthStr, dayStr] = match;
  const year = +yearStr;
  const month = +monthStr;
  const day = +dayStr;

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    devError(`dateStrToUtcDate2: invalid date string: ${dateStr}`);
    return new Date('Invalid Date');
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    devError(`dateStrToUtcDate3: invalid date string: ${dateStr}`);
    return new Date('Invalid Date');
  }

  return date;
};
