import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { TRACKING_INTERVAL, WORKLOG_DATE_STR_FORMAT } from '../../app.constants';
import { BehaviorSubject } from 'rxjs';
import { Tick } from './time-tracking';

@Injectable({
  providedIn: 'root'
})
export class TimeTrackingService {
  public tick$: BehaviorSubject<Tick> = new BehaviorSubject({
    duration: 0,
    date: moment().format(WORKLOG_DATE_STR_FORMAT)
  });

  init() {
    this.initPoll();
  }

  initPoll() {
    let currentTrackingStart = moment();

    setInterval(() => {
      const now = moment();
      const realPeriodDuration = moment.duration(now.diff(currentTrackingStart))
        .asMilliseconds();
      this.tick$.next({
        duration: realPeriodDuration,
        date: now.format(WORKLOG_DATE_STR_FORMAT)
      });
      // set to now
      currentTrackingStart = moment();
    }, TRACKING_INTERVAL);
  }
}
