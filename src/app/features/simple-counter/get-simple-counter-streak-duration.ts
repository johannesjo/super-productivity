import { SimpleCounterCopy } from './simple-counter.model';
import { getWorklogStr } from '../../util/get-work-log-str';

export const getSimpleCounterStreakDuration = (
  simpleCounter: SimpleCounterCopy,
): number => {
  const countOnDay = simpleCounter.countOnDay;
  const today = getWorklogStr();
  const todayCount = countOnDay[today];
  if (!todayCount) {
    return 0;
  }

  let streak = 0;
  const date = new Date();

  while (countOnDay[getWorklogStr(date)] >= simpleCounter.streakMinValue) {
    // while (
    //   countOnDay[getWorklogStr(date)] >= simpleCounter.streakMinValue &&
    //   simpleCounter.streakWeekDays.includes(date.getDay())
    // ) {
    streak++;
    date.setDate(date.getDate() - 1);
  }

  return streak;
};
