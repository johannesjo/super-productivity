import { TASK_REPEAT_WEEKDAY_MAP, TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getDiffInDays } from '../../../util/get-diff-in-days';
import { getDiffInMonth } from '../../../util/get-diff-in-month';
import { getDiffInYears } from '../../../util/get-diff-in-years';
import { getDiffInWeeks } from '../../../util/get-diff-in-weeks';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';

export const getNewestPossibleDueDate = (
  taskRepeatCfg: TaskRepeatCfg,
  today: Date,
): Date | null => {
  if (!taskRepeatCfg.startDate) {
    throw new Error('Repeat startDate needs to be defined');
  }
  if (+taskRepeatCfg.repeatEvery < 1) {
    throw new Error('Invalid repeatEvery value given');
  }

  const checkDate = new Date(today);
  const startDateDate = dateStrToUtcDate(taskRepeatCfg.startDate);
  const lastTaskCreation = new Date(taskRepeatCfg.lastTaskCreation);
  // set to 2 to be safer(?) for summer/winter time affected comparisons
  checkDate.setHours(2, 0, 0, 0);
  lastTaskCreation.setHours(2, 0, 0, 0);

  if (startDateDate > checkDate) {
    return null;
  }

  switch (taskRepeatCfg.repeatCycle) {
    case 'DAILY': {
      const nrOfDaysToCheck = taskRepeatCfg.repeatEvery + 1;

      // TODO add unit test for today
      for (let i = 0; i < nrOfDaysToCheck; i++) {
        const diffInDays = getDiffInDays(startDateDate, checkDate);
        if (checkDate <= lastTaskCreation || diffInDays < 0) {
          break;
        }
        if (diffInDays % taskRepeatCfg.repeatEvery === 0) {
          return checkDate;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      return null;
    }

    case 'WEEKLY': {
      // eslint-disable-next-line no-mixed-operators
      const nrOfDaysToCheck = taskRepeatCfg.repeatEvery * 7 + 1;

      for (let i = 0; i < nrOfDaysToCheck; i++) {
        const diffInWeeks = getDiffInWeeks(startDateDate, checkDate);
        if (checkDate <= lastTaskCreation || diffInWeeks < 0) {
          break;
        }
        const todayDay = checkDate.getDay();
        const todayDayStr: keyof TaskRepeatCfg = TASK_REPEAT_WEEKDAY_MAP[todayDay];

        if (diffInWeeks % taskRepeatCfg.repeatEvery === 0 && taskRepeatCfg[todayDayStr]) {
          return checkDate;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      return null;
    }

    case 'MONTHLY': {
      const nrOfMonthsToCheck = taskRepeatCfg.repeatEvery;
      const dayOfMonthRepeat = startDateDate.getDate();

      checkDate.setDate(dayOfMonthRepeat);

      if (today.getDate() < dayOfMonthRepeat) {
        checkDate.setMonth(checkDate.getMonth() - 1);
      }

      for (let i = 0; i < nrOfMonthsToCheck; i++) {
        const diffInMonth = getDiffInMonth(startDateDate, checkDate);

        if (checkDate <= lastTaskCreation || diffInMonth < 0) {
          break;
        }
        if (diffInMonth % taskRepeatCfg.repeatEvery === 0) {
          return checkDate;
        }
        checkDate.setMonth(checkDate.getMonth() - 1);
      }
      return null;
    }

    case 'YEARLY': {
      const nrOfYearsToCheck = taskRepeatCfg.repeatEvery;
      const dayOfMonthRepeat = startDateDate.getDate();
      const monthOfMonthRepeat = startDateDate.getMonth();
      checkDate.setDate(dayOfMonthRepeat);
      checkDate.setMonth(monthOfMonthRepeat);

      if (today.getMonth() < monthOfMonthRepeat) {
        checkDate.setFullYear(checkDate.getFullYear() - 1);
      }
      if (today.getMonth() === monthOfMonthRepeat && today.getDate() < dayOfMonthRepeat) {
        checkDate.setFullYear(checkDate.getFullYear() - 1);
      }

      for (let i = 0; i < nrOfYearsToCheck; i++) {
        const diffInYears = getDiffInYears(startDateDate, checkDate);

        if (checkDate <= lastTaskCreation || diffInYears < 0) {
          break;
        }
        if (diffInYears % taskRepeatCfg.repeatEvery === 0) {
          return checkDate;
        }
        checkDate.setFullYear(checkDate.getFullYear() - 1);
      }
      return null;
    }

    default:
      return null;
  }
};
