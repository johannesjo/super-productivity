import { Injectable } from '@angular/core';
import { interval, merge, Observable, of } from 'rxjs';
import {
  filter,
  map,
  pairwise,
  scan,
  shareReplay,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';

const TICK_DURATION = 500;

@Injectable({
  providedIn: 'root',
})
export class FocusModeService {
  private _isRunning$ = of(true);
  private _sessionDuration$ = of(1 * 60 * 1000);
  private _timer$: Observable<number> = interval(TICK_DURATION).pipe(
    switchMap(() => of(Date.now())),
    pairwise(),
    map(([a, b]) => b - a),
  );

  tick$: Observable<number> = this._timer$.pipe(
    withLatestFrom(this._isRunning$),
    filter(([v, isRunning]) => isRunning),
    map(([tick]) => tick * -1),
  );

  currentSessionTime$: Observable<number> = merge(
    this._sessionDuration$,
    this.tick$,
  ).pipe(
    scan((acc, value) => {
      return value < 0 ? acc + value : value;
    }),
    shareReplay(1),
  );
  sessionProgress$: Observable<number> = this.currentSessionTime$.pipe(
    withLatestFrom(this._sessionDuration$),
    map(([currentTime, initialTime]) => {
      return ((initialTime - currentTime) * 100) / initialTime;
    }),
  );

  constructor() {
    this.currentSessionTime$.subscribe((v) => console.log(`currentSessionTime$`, v));
  }
}
