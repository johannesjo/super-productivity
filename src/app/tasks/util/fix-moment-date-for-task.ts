import { fixMomentDate } from './fix-moment-date';

const propsToFix = ['timeEstimate', 'timeSpent'];
export const fixMomentDatesForTask = (task) => {
  propsToFix.forEach((prop) => {
    if (task[prop]) {
      task[prop] = fixMomentDate(task[prop]);
    }
    if (task.timeSpentOnDay) {
      const timeSpentOnDay = task.timeSpentOnDay;
      Object.keys(timeSpentOnDay).forEach(strDate => {
        if (timeSpentOnDay[strDate]) {
          timeSpentOnDay[strDate] = fixMomentDate(timeSpentOnDay[strDate]);
        }
      });
    }
  });
};