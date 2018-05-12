import {Injectable} from '@angular/core';
import {WORKLOG_DATE_STR_FORMAT} from '../app.constants';
import * as moment from 'moment';

@Injectable()
export class TaskUtilService {

  constructor() {
  }

  static getTodayStr() {
    return moment().format(WORKLOG_DATE_STR_FORMAT);
  }
}
