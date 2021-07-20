import { TimeSpentOnDay } from '../task.model';

export const calcTotalTimeSpent = (timeSpentOnDay: TimeSpentOnDay): number => {
  let totalTimeSpent = 0;
  Object.keys(timeSpentOnDay).forEach((strDate) => {
    if (timeSpentOnDay[strDate]) {
      totalTimeSpent += +timeSpentOnDay[strDate];
    }
  });
  return totalTimeSpent;
};
