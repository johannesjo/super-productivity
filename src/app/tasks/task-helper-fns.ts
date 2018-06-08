import * as moment from 'moment';
import { durationFromString } from '../duration/duration-from-string.pipe';
import { durationToString } from '../duration/duration-to-string.pipe';

export const calcTotalTimeSpent = (timeSpentOnDay) => {
  const totalTimeSpent = moment.duration();
  Object.keys(timeSpentOnDay).forEach(strDate => {
    if (timeSpentOnDay[strDate]) {
      console.log(timeSpentOnDay[strDate]);
      const durationForDay = durationFromString(timeSpentOnDay[strDate]);
      totalTimeSpent.add(durationForDay.asSeconds(), 's');
    }
  });

  if (totalTimeSpent.asMinutes() > 0) {
    return durationToString(totalTimeSpent);
  } else {
    return '-';
  }
};

export const fixMomentDate = (str) => {
  return moment.duration(str);
};

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

export const parseFromLs = (lsKey) => {
  const tasks = JSON.parse(localStorage.getItem(lsKey));

  // tasks.forEach((task) => {
  //   fixMomentDatesForTask(task);
  //   if (task.subTasks) {
  //     task.subTasks.forEach((subTask) => {
  //       fixMomentDatesForTask(subTask);
  //     });
  //   }
  // });

  return tasks;
};
