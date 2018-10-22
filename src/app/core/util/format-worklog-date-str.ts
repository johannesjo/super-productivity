import * as moment from 'moment';
import { WORKLOG_DATE_STR_FORMAT } from '../../app.constants';

export const formatWorklogDateStr = (date) => {
  return moment(date).format(WORKLOG_DATE_STR_FORMAT);
};
