import { Injectable } from '@angular/core';
import { TRACKING_INTERVAL } from '../../app.constants';
import { interval, Observable, of } from 'rxjs';
import { concatMap, distinctUntilChanged, map, share } from 'rxjs/operators';
import { Tick } from './tick.model';
import { getWorklogStr } from '../../util/get-work-log-str';

@Injectable({
  providedIn: 'root',
})
export class GlobalTrackingIntervalService {
  globalInterval$: Observable<number> = interval(TRACKING_INTERVAL).pipe(share());
  private _currentTrackingStart: number;
  tick$: Observable<Tick> = this.globalInterval$.pipe(
    map(() => {
      const delta = Date.now() - this._currentTrackingStart;
      this._currentTrackingStart = Date.now();
      return {
        duration: delta,
        date: getWorklogStr(),
        timestamp: Date.now(),
      };
    }),
    // important because we want the same interval for everyone
    share(),
  );

  todayDateStr$: Observable<string> = this.globalInterval$.pipe(
    concatMap(() => of(getWorklogStr())),
    distinctUntilChanged(),
  );

  constructor() {
    this._currentTrackingStart = Date.now();
  }
}
