import { Injectable } from '@angular/core';
import { TRACKING_INTERVAL } from '../../app.constants';
import { interval, Observable, of } from 'rxjs';
import {
  concatMap,
  distinctUntilChanged,
  map,
  share,
  shareReplay,
  startWith,
} from 'rxjs/operators';
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
    startWith(getWorklogStr()),
    concatMap(() => of(getWorklogStr())),
    distinctUntilChanged(),
    // needs to be shareReplay otherwise some instances will never receive an update until a change occurs
    shareReplay(1),
  );

  constructor() {
    this._currentTrackingStart = Date.now();
  }
}
