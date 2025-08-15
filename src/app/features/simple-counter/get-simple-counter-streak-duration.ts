import { SimpleCounterCopy } from './simple-counter.model';
import { getDbDateStr } from '../../util/get-db-date-str';

export const getSimpleCounterStreakDuration = (
  simpleCounter: SimpleCounterCopy,
): number => {
  const countOnDay = simpleCounter.countOnDay;

  if (!simpleCounter.streakWeekDays || !simpleCounter.streakMinValue) {
    return 0;
  }

  let streak = 0;
  const date = new Date();
  // set date to last weekday set in streakWeekDays
  setDayToLastConsideredWeekday(date, simpleCounter.streakWeekDays);

  if (
    getDbDateStr(date) === getDbDateStr(new Date()) &&
    (!countOnDay[getDbDateStr(date)] ||
      countOnDay[getDbDateStr(date)] < simpleCounter.streakMinValue)
  ) {
    date.setDate(date.getDate() - 1);
    setDayToLastConsideredWeekday(date, simpleCounter.streakWeekDays);
  }

  while (countOnDay[getDbDateStr(date)] >= simpleCounter.streakMinValue) {
    streak++;
    date.setDate(date.getDate() - 1);
    setDayToLastConsideredWeekday(date, simpleCounter.streakWeekDays);
  }

  return streak;
};

const setDayToLastConsideredWeekday = (
  date: Date,
  streakWeekDays: Record<number, boolean>,
): void => {
  let i = 0;
  while (!streakWeekDays[date.getDay()]) {
    date.setDate(date.getDate() - 1);
    i++;
    // fail-safe to avoid infinite loop when all values are false
    if (i > 7) {
      break;
    }
  }
  return undefined;
};
