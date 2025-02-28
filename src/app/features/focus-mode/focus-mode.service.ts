import { inject, Injectable } from '@angular/core';
import { combineLatest, EMPTY, interval, merge, Observable, of } from 'rxjs';
import {
  selectFocusSessionDuration,
  selectIsFocusSessionRunning,
} from './store/focus-mode.selectors';
import {
  map,
  mapTo,
  pairwise,
  scan,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';
import { cancelFocusSession, unPauseFocusSession } from './store/focus-mode.actions';
import { Store } from '@ngrx/store';

const TICK_DURATION = 500;

@Injectable({
  providedIn: 'root',
})
export class FocusModeService {
  private _store = inject(Store);
  private _actions$ = inject(Actions);
  private _isRunning$ = this._store.select(selectIsFocusSessionRunning);

  private _plannedSessionDuration$ = this._store.select(selectFocusSessionDuration);
  private _timer$: Observable<number> = interval(TICK_DURATION).pipe(
    switchMap(() => of(Date.now())),
    pairwise(),
    map(([a, b]) => b - a),
  );

  private _tick$: Observable<number> = this._isRunning$.pipe(
    switchMap((isRunning) => (isRunning ? this._timer$ : EMPTY)),
    map((tick) => tick * -1),
  );

  currentSessionTime$: Observable<number> = merge(
    // first val is negative otherwise
    // TODO maybe comment in again
    // startWith(567),

    this._tick$,
    this._actions$.pipe(ofType(cancelFocusSession), mapTo(0)),
    this._actions$.pipe(
      ofType(unPauseFocusSession),
      map(({ idleTimeToAdd = 0 }) => idleTimeToAdd * -1),
    ),
    // TODO remove if not needed
    // this._store.select(selectFocusModeMode).pipe(
    //   switchMap((mode) =>
    //     mode === FocusModeMode.Countdown
    //       ? // needed in case plannedSessionDuration did not change
    //         this._actions$.pipe(
    //           ofType(startFocusSession, cancelFocusSession),
    //           switchMap(() => this._plannedSessionDuration$.pipe(first())),
    //         )
    //       : EMPTY,
    //   ),
    // ),
  ).pipe(
    scan((acc, value) => {
      const accValMinZero = acc < 0 ? 0 : acc;
      console.log('VALUPD currentSessionTime', value, value < 0, accValMinZero);
      return value < 0 ? accValMinZero - value : value;
    }),
    shareReplay(1),
    // tap((v) => console.log('___currentSessionTimeShared', v)),
  );

  timeToGo$: Observable<number> = combineLatest([
    this.currentSessionTime$.pipe(startWith(0)),
    this._plannedSessionDuration$,
  ]).pipe(
    tap((v) => console.log('timeToGo$ params', v)),
    map(
      ([currentSessionTime, plannedSessionDuration]) =>
        plannedSessionDuration - currentSessionTime,
    ),
  );
  // timeToGo$: Observable<number> = this.currentSessionTime$.pipe(
  //   withLatestFrom(this._plannedSessionDuration$),
  //   tap((v) => console.log('timeToGo$ params', v)),
  //
  //   map(
  //     ([currentSessionTime, plannedSessionDuration]) =>
  //       plannedSessionDuration - currentSessionTime,
  //   ),
  // );

  sessionProgress$ = combineLatest([this.timeToGo$, this._plannedSessionDuration$]).pipe(
    // tap((v) => console.log('sessionProgress$ params', v)),
    map(
      ([timeToGo, plannedSessionDuration]) =>
        ((plannedSessionDuration - timeToGo) * 100) / plannedSessionDuration,
    ),
  );
}
