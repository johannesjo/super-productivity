import { inject, Injectable } from '@angular/core';
import { combineLatest, EMPTY, interval, merge, Observable, of } from 'rxjs';
import {
  selectFocusSessionDuration,
  selectIsFocusSessionRunning,
} from './store/focus-mode.selectors';
import {
  filter,
  map,
  mapTo,
  pairwise,
  scan,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';
import {
  cancelFocusSession,
  focusSessionDone,
  unPauseFocusSession,
} from './store/focus-mode.actions';
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
    this._tick$,
    this._actions$.pipe(ofType(cancelFocusSession), mapTo(0)),
    this._actions$.pipe(
      ofType(focusSessionDone),
      filter(({ isResetPlannedSessionDuration }) => !!isResetPlannedSessionDuration),
      mapTo(0),
    ),
    this._actions$.pipe(
      ofType(unPauseFocusSession),
      map(({ idleTimeToAdd = 0 }) => idleTimeToAdd * -1),
    ),
  ).pipe(
    scan((acc, value) => {
      // NOTE: to prevent initial negative acc values
      const accValMinZero = acc < 0 ? 0 : acc;
      // console.log('VALUPD currentSessionTime', value, value < 0, accValMinZero);
      return value < 0 ? accValMinZero - value : value;
    }),
    shareReplay(1),
  );

  timeToGo$: Observable<number> = combineLatest([
    this.currentSessionTime$.pipe(startWith(0)),
    this._plannedSessionDuration$,
  ]).pipe(
    map(
      ([currentSessionTime, plannedSessionDuration]) =>
        plannedSessionDuration - currentSessionTime,
    ),
  );

  sessionProgress$ = combineLatest([this.timeToGo$, this._plannedSessionDuration$]).pipe(
    map(
      ([timeToGo, plannedSessionDuration]) =>
        ((plannedSessionDuration - timeToGo) * 100) / plannedSessionDuration,
    ),
  );
}
