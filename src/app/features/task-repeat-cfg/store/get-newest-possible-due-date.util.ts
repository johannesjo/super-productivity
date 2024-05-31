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

      for (let i = 0; i < taskRepeatCfg.repeatEvery; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const diffInDays = getDiffInDays(startDateDate, checkDate);
        // console.log(startDateDate);
        // console.log(checkDate);
        // console.log(diffInDays);
        // console.log(diffInDays % taskRepeatCfg.repeatEvery);
        if (
          // start date is not in the future
          diffInDays >= 0 &&
          diffInDays % taskRepeatCfg.repeatEvery === 0 &&
          checkDate.getTime() > taskRepeatCfg.lastTaskCreation
        ) {
          return checkDate;
        }
      }
      return null;
    }

    // case 'WEEKLY': {
    //   if (!taskRepeatCfg.startDate) {
    //     throw new Error('Repeat startDate needs to be defined for WEEKLY');
    //   }
    //   if (+taskRepeatCfg.repeatEvery < 1) {
    //     throw new Error('Invalid repeatEvery value given for WEEKLY');
    //   }
    //   const checkDate = new Date(today);
    //   const startDateDate = new Date(taskRepeatCfg.startDate);
    //
    //   for (let i = 0; i < taskRepeatCfg.repeatEvery * 7; i++) {
    //     checkDate.setDate(checkDate.getDate() - 1);
    //     const diffInDays = getDiffInDays(startDateDate, checkDate);
    //     if (
    //       // start date is not in the future
    //       diffInDays >= 0 &&
    //       diffInDays % (taskRepeatCfg.repeatEvery * 7) === 0 &&
    //       checkDate.getTime() > taskRepeatCfg.lastTaskCreation
    //     ) {
    //       return checkDate;
    //     }
    //   }
    //   return null;
    // }

    // case 'WEEKLY': {
    //   const dueDate = new Date(dayToCheck);
    //   for (let i = 0; i < 7; i++) {
    //     dueDate.setDate(dueDate.getDate() - 1);
    //     if (
    //       taskRepeatCfg[TASK_REPEAT_WEEKDAY_MAP[dueDate.getDay()]] &&
    //       i % taskRepeatCfg.repeatEvery === 0
    //     ) {
    //       return dueDate;
    //     }
    //   }
    //   return null;
    // }
    //
    // case 'MONTHLY': {
    //   const dueDate = new Date(dayToCheck);
    //   dueDate.setMonth(dayToCheck.getMonth() - taskRepeatCfg.repeatEvery);
    //   return dueDate < dayToCheck ? dueDate : null;
    // }
    //
    // case 'YEARLY': {
    //   const dueDate = new Date(dayToCheck);
    //   dueDate.setFullYear(dayToCheck.getFullYear() - taskRepeatCfg.repeatEvery);
    //   return dueDate < dayToCheck ? dueDate : null;
    // }

    default:
      return null;
  }
};
