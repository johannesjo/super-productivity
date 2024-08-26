import { WORKLOG_DATE_STR_FORMAT } from '../../../app.constants';
import moment from 'moment';
// TODO maybe remove in favor of getWorklogStr
// NOTE: locale is important as it might break a lot of stuff for non arabic numbers
export const getTodayStr = (): string =>
  moment().locale('en').format(WORKLOG_DATE_STR_FORMAT);
