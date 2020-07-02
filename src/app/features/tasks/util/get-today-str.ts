import { WORKLOG_DATE_STR_FORMAT } from '../../../app.constants';
import * as moment from 'moment';
// TODO maybe remove in favor of getWorklogStr
// NOTE: locale is important as it might break a lot of stuff for non arabic numbers
export const getTodayStr = () => moment().locale('en').format(WORKLOG_DATE_STR_FORMAT);
