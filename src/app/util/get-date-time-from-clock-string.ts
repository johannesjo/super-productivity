import { isValidSplitTime } from './is-valid-split-time';

export const getDateTimeFromClockString = (
  clockString: string,
  date: number | Date,
): number => {
  const [h, m] = clockString.split(':');

  if (!isValidSplitTime(clockString)) {
    throw new Error('Invalid clock string');
  }

  const d = new Date(date);
  d.setSeconds(0, 0);
  d.setHours(+h);
  d.setMinutes(+m);
  return d.getTime();
};
