import { durationFromString } from '../../ui/duration/duration-from-string.pipe';
import { durationToString } from '../../ui/duration/duration-to-string.pipe';
import * as moment from 'moment';

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
