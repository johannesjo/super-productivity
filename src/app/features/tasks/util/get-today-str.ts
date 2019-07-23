import {WORKLOG_DATE_STR_FORMAT} from '../../../app.constants';
import * as moment from 'moment';
// TODO maybe remove in favor of getWorklogStr
export const getTodayStr = () => moment().format(WORKLOG_DATE_STR_FORMAT);
