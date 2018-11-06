import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { TRACKING_INTERVAL, WORKLOG_DATE_STR_FORMAT } from '../../app.constants';
import { interval, Observable } from 'rxjs';
import { map, share } from 'rxjs/operators';
import { Tick } from './time-tracking';
import { getWorklogStr } from '../util/get-work-log-str';

@Injectable({
  providedIn: 'root'
})
export class TimeTrackingService {
  private _currentTrackingStart: number;
  public tick$: Observable<Tick> = interval(TRACKING_INTERVAL).pipe(
    map(() => {
      const delta = Date.now() - this._currentTrackingStart;
      this._currentTrackingStart = Date.now();
      return {
        duration: delta,
        date: getWorklogStr()
      };
    }),
    // important because we want the same interval for everyone
    share()
  );


  constructor() {
    this._currentTrackingStart = Date.now();
  }
}
