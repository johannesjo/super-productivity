import * as moment from 'moment-mini';

import { WORKLOG_DATE_STR_FORMAT } from '../app.constants';

export const getWorklogStr = (date: Date | number = new Date()): string => {
  return moment(date).format(WORKLOG_DATE_STR_FORMAT);
};
