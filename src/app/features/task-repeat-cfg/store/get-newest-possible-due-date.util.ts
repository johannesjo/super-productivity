import { TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getDiffInDays } from '../../../util/get-diff-in-days';
import { getDiffInMonth } from '../../../util/get-diff-in-month';
import { getDiffInYears } from '../../../util/get-diff-in-years';

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
      const nrOfDayToCheck = taskRepeatCfg.repeatEvery;

      // TODO add unit test for today
      for (let i = 0; i < nrOfDayToCheck; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const diffInDays = getDiffInDays(startDateDate, checkDate);
        if (checkDate <= lastTaskCreation || diffInDays < 0) {
          break;
        }
        if (diffInDays % taskRepeatCfg.repeatEvery === 0) {
          return checkDate;
        }
      }
      return null;
    }

    case 'WEEKLY': {
      // TODO check if i move them up
      const checkDate = new Date(today);
      const startDateDate = new Date(taskRepeatCfg.startDate);
      const lastTaskCreation = new Date(taskRepeatCfg.lastTaskCreation);
      const nrOfDayToCheck = taskRepeatCfg.repeatEvery * 7;

      // TODO add unit test for today
      for (let i = 0; i < nrOfDayToCheck; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const diffInDays = getDiffInDays(startDateDate, checkDate);
        if (checkDate <= lastTaskCreation || diffInDays < 0) {
          break;
        }
        if (diffInDays % (taskRepeatCfg.repeatEvery * 7) === 0) {
          return checkDate;
        }
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
