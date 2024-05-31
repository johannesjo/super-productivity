import { TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getDiffInDays } from '../../../util/get-diff-in-days';

export const getNewestPossibleDueDate = (
  taskRepeatCfg: TaskRepeatCfg,
  today: Date,
): Date | null => {
  switch (taskRepeatCfg.repeatCycle) {
    case 'DAILY': {
      if (!taskRepeatCfg.startDate) {
        throw new Error('Repeat startDate needs to be defined for DAILY');
      }
      if (+taskRepeatCfg.repeatEvery < 1) {
        throw new Error('Invalid repeatEvery value given for DAILY');
      }
      const checkDate = new Date(today);
      const startDateDate = new Date(taskRepeatCfg.startDate);
      const lastTaskCreation = new Date(taskRepeatCfg.lastTaskCreation);

      for (let i = 0; i < taskRepeatCfg.repeatEvery; i++) {
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
      if (!taskRepeatCfg.startDate) {
        throw new Error('Repeat startDate needs to be defined for WEEKLY');
      }
      if (+taskRepeatCfg.repeatEvery < 1) {
        throw new Error('Invalid repeatEvery value given for WEEKLY');
      }
      const checkDate = new Date(today);
      const startDateDate = new Date(taskRepeatCfg.startDate);
      const lastTaskCreation = new Date(taskRepeatCfg.lastTaskCreation);

      for (let i = 0; i < taskRepeatCfg.repeatEvery * 7; i++) {
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

    default:
      return null;
  }
};
