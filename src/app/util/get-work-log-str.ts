import * as moment from 'moment';

import { WORKLOG_DATE_STR_FORMAT } from '../app.constants';

export const getWorklogStr = (date: Date | number | string = new Date()): string => {
  // NOTE: locale is important as it might break a lot of stuff for non arabic numbers
  return moment(date).locale('en').format(WORKLOG_DATE_STR_FORMAT);
};
