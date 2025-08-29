import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, interval, merge, of } from 'rxjs';
import {
  selectFocusModeBreakDuration,
  selectFocusModeBreakTimeElapsed,
  selectFocusModeCurrentCycle,
  selectFocusModeIsBreak,
  selectFocusModeIsBreakLong,
  selectFocusModeMode,
  selectFocusSessionActivePage,
  selectFocusSessionDuration,
  selectFocusSessionTimeElapsed,
  selectIsFocusOverlayShown,
  selectIsFocusSessionRunning,
  selectLastSessionTotalDurationOrTimeElapsedFallback,
} from './store/focus-mode.selectors';
import { selectFocusModeConfig } from '../config/store/global-config.reducer';
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
  completeBreak,
  focusSessionDone,
  skipBreak,
  startBreak,
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

  private _timer$ = interval(TICK_DURATION).pipe(
    switchMap(() => of(Date.now())),
    pairwise(),
    map(([a, b]) => b - a),
  );

  private _tick$ = this._isRunning$.pipe(
    switchMap((isRunning) => (isRunning ? this._timer$ : EMPTY)),
    map((tick) => tick * -1),
  );

  currentSessionTime$ = merge(
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
      const accValMinZero = acc < 0 ? 0 : acc;
      return value < 0 ? accValMinZero - value : value;
    }),
    shareReplay(1),
  );

  timeToGo$ = this.currentSessionTime$.pipe(
    startWith(0),
    switchMap((currentSessionTime) =>
      this._plannedSessionDuration$.pipe(
        map((plannedDuration) => plannedDuration - currentSessionTime),
      ),
    ),
  );

  sessionProgress$ = this.currentSessionTime$.pipe(
    startWith(0),
    switchMap((currentSessionTime) =>
      this._plannedSessionDuration$.pipe(
        map((plannedDuration) =>
          plannedDuration > 0 ? (currentSessionTime * 100) / plannedDuration : 0,
        ),
      ),
    ),
  );

  // Core state signals
  isFocusSessionRunning = toSignal(this._store.select(selectIsFocusSessionRunning), {
    initialValue: false,
  });
  focusModeMode = toSignal(this._store.select(selectFocusModeMode));
  focusSessionDuration = toSignal(this._store.select(selectFocusSessionDuration), {
    initialValue: 25 * 60 * 1000,
  });
  isFocusOverlayShown = toSignal(this._store.select(selectIsFocusOverlayShown), {
    initialValue: false,
  });
  focusSessionTimeElapsed = toSignal(this._store.select(selectFocusSessionTimeElapsed), {
    initialValue: 0,
  });
  lastSessionTotalDurationOrTimeElapsedFallback = toSignal(
    this._store.select(selectLastSessionTotalDurationOrTimeElapsedFallback),
    { initialValue: 0 },
  );
  focusSessionActivePage = toSignal(this._store.select(selectFocusSessionActivePage));
  focusModeConfig = toSignal(this._store.select(selectFocusModeConfig));

  // Computed session signals
  currentSessionTime = toSignal(this.currentSessionTime$, { initialValue: 0 });
  timeToGo = toSignal(this.timeToGo$, { initialValue: 0 });
  sessionProgress = toSignal(this.sessionProgress$, { initialValue: 0 });

  // Break timer for pomodoro mode
  private _isBreak$ = this._store.select(selectFocusModeIsBreak);
  private _breakDuration$ = this._store.select(selectFocusModeBreakDuration);

  private _breakTimer$ = interval(TICK_DURATION).pipe(
    switchMap(() => of(Date.now())),
    pairwise(),
    map(([a, b]) => b - a),
  );

  private _breakTick$ = this._isBreak$.pipe(
    switchMap((isBreak) => (isBreak ? this._breakTimer$ : EMPTY)),
    map((tick) => tick * -1),
  );

  currentBreakTime$ = merge(
    this._breakTick$,
    this._actions$.pipe(ofType(startBreak, skipBreak, completeBreak), mapTo(0)),
  ).pipe(
    scan((acc, value) => {
      const accValMinZero = acc < 0 ? 0 : acc;
      return value < 0 ? accValMinZero - value : value;
    }),
    shareReplay(1),
  );

  breakTimeToGo$ = this.currentBreakTime$.pipe(
    startWith(0),
    switchMap((currentBreakTime) =>
      this._breakDuration$.pipe(map((breakDuration) => breakDuration - currentBreakTime)),
    ),
  );

  // Break state signals
  focusModeIsBreak = toSignal(this._store.select(selectFocusModeIsBreak), {
    initialValue: false,
  });
  focusModeBreakTimeElapsed = toSignal(
    this._store.select(selectFocusModeBreakTimeElapsed),
    {
      initialValue: 0,
    },
  );
  focusModeBreakDuration = toSignal(this._store.select(selectFocusModeBreakDuration), {
    initialValue: 5 * 60 * 1000,
  });
  focusModeIsBreakLong = toSignal(this._store.select(selectFocusModeIsBreakLong), {
    initialValue: false,
  });
  focusModeCurrentCycle = toSignal(this._store.select(selectFocusModeCurrentCycle), {
    initialValue: 1,
  });

  // Computed break signals
  currentBreakTime = toSignal(this.currentBreakTime$, { initialValue: 0 });
  breakTimeToGo = toSignal(this.breakTimeToGo$, { initialValue: 0 });
  breakProgress = computed(() => {
    const currentBreakTime = this.currentBreakTime();
    const breakDuration = this.focusModeBreakDuration();
    return breakDuration > 0 ? (currentBreakTime * 100) / breakDuration : 0;
  });
}
