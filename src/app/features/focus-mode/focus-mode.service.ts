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
import { Store } from '@ngrx/store';
import {
  selectFocusSessionDuration,
  selectIsFocusOverlayShown,
  selectIsFocusSessionRunning,
} from './store/focus-mode.selectors';
import {
  hideFocusOverlay,
  setFocusSessionDuration,
  showFocusOverlay,
} from './store/focus-mode.actions';

const TICK_DURATION = 500;

@Injectable({
  providedIn: 'root',
})
export class FocusModeService {
  private _isRunning$ = this._store.select(selectIsFocusSessionRunning);
  sessionDuration$ = this._store.select(selectFocusSessionDuration);

  private _timer$: Observable<number> = interval(TICK_DURATION).pipe(
    switchMap(() => of(Date.now())),
    pairwise(),
    map(([a, b]) => b - a),
  );

  isShowFocusOverlay$: Observable<boolean> = this._store.select(
    selectIsFocusOverlayShown,
  );
  tick$: Observable<number> = this._timer$.pipe(
    withLatestFrom(this._isRunning$),
    filter(([v, isRunning]) => isRunning),
    map(([tick]) => tick * -1),
  );

  currentSessionTime$: Observable<number> = merge(this.sessionDuration$, this.tick$).pipe(
    scan((acc, value) => {
      return value < 0 ? acc + value : value;
    }),
    shareReplay(1),
  );
  sessionProgress$: Observable<number> = this.currentSessionTime$.pipe(
    withLatestFrom(this.sessionDuration$),
    map(([currentTime, initialTime]) => {
      return ((initialTime - currentTime) * 100) / initialTime;
    }),
  );

  constructor(private _store: Store) {
    this.currentSessionTime$.subscribe((v) => console.log(`currentSessionTime$`, v));
  }

  showFocusOverlay(): void {
    this._store.dispatch(showFocusOverlay());
  }

  hideFocusOverlay(): void {
    this._store.dispatch(hideFocusOverlay());
  }

  setFocusSessionDuration(focusSessionDuration: number): void {
    this._store.dispatch(setFocusSessionDuration({ focusSessionDuration }));
  }
}
