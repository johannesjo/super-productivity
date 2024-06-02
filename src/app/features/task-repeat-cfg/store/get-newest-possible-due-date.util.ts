import { TASK_REPEAT_WEEKDAY_MAP, TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getDiffInDays } from '../../../util/get-diff-in-days';
import { getDiffInMonth } from '../../../util/get-diff-in-month';
import { getDiffInYears } from '../../../util/get-diff-in-years';
import { getDiffInWeeks } from '../../../util/get-diff-in-weeks';

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

  switch (taskRepeatCfg.repeatCycle) {
    case 'DAILY': {
      const checkDate = new Date(today);
      const startDateDate = new Date(taskRepeatCfg.startDate);
      const lastTaskCreation = new Date(taskRepeatCfg.lastTaskCreation);
      const nrOfDayToCheck = taskRepeatCfg.repeatEvery + 1;

      // TODO add unit test for today
      for (let i = 0; i < nrOfDayToCheck; i++) {
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
      const checkDate = new Date(today);
      const startDateDate = new Date(taskRepeatCfg.startDate);
      const lastTaskCreation = new Date(taskRepeatCfg.lastTaskCreation);
      // eslint-disable-next-line no-mixed-operators
      const nrOfDayToCheck = taskRepeatCfg.repeatEvery * 7 + 1;

      for (let i = 0; i < nrOfDayToCheck; i++) {
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
      const checkDate = new Date(today);
      const startDateDate = new Date(taskRepeatCfg.startDate);
      const lastTaskCreation = new Date(taskRepeatCfg.lastTaskCreation);
      const nrOfMonthsToCheck = taskRepeatCfg.repeatEvery;
      const dayOfMonthRepeat = startDateDate.getDate();
      checkDate.setDate(dayOfMonthRepeat);
      checkDate.setHours(0, 0, 0, 0);

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
      const checkDate = new Date(today);
      const startDateDate = new Date(taskRepeatCfg.startDate);
      const lastTaskCreation = new Date(taskRepeatCfg.lastTaskCreation);
      const nrOfYearsToCheck = taskRepeatCfg.repeatEvery;
      const dayOfMonthRepeat = startDateDate.getDate();
      const monthOfMonthRepeat = startDateDate.getMonth();
      checkDate.setDate(dayOfMonthRepeat);
      checkDate.setMonth(monthOfMonthRepeat);
      checkDate.setHours(0, 0, 0, 0);

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
