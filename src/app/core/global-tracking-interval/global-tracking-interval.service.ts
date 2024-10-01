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
  switchMap,
} from 'rxjs/operators';
import { Tick } from './tick.model';
import { DateService } from 'src/app/core/date/date.service';
import { GlobalConfigService } from 'src/app/features/config/global-config.service';

@Injectable({
  providedIn: 'root',
})
export class GlobalTrackingIntervalService {
  globalInterval$: Observable<number> = this._globalConfigService.cfg$.pipe(
    map((cfg) => cfg?.timeTracking?.trackingInterval ?? TRACKING_INTERVAL),
    switchMap((_interval) => interval(_interval)),
    share(),
  );
  private _currentTrackingStart: number;
  tick$: Observable<Tick> = this.globalInterval$.pipe(
    map(() => {
      const delta = Date.now() - this._currentTrackingStart;
      this._currentTrackingStart = Date.now();
      return {
        duration: delta,
        date: this._dateService.todayStr(),
        timestamp: Date.now(),
      };
    }),
    // important because we want the same interval for everyone
    share(),
  );

  todayDateStr$: Observable<string> = this.globalInterval$.pipe(
    startWith(this._dateService.todayStr()),
    concatMap(() => of(this._dateService.todayStr())),
    distinctUntilChanged(),
    // needs to be shareReplay otherwise some instances will never receive an update until a change occurs
    shareReplay(1),
  );

  constructor(
    private _dateService: DateService,
    private _globalConfigService: GlobalConfigService,
  ) {
    this._currentTrackingStart = Date.now();
  }
}
