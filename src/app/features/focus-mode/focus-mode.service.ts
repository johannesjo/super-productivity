import { computed, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, tap } from 'rxjs/operators';
import * as actions from './store/focus-mode.actions';
import * as selectors from './store/focus-mode.selectors';
import { GlobalConfigService } from '../config/global-config.service';
import { selectFocusModeConfig } from '../config/store/global-config.reducer';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { FocusModeMode } from './focus-mode.model';

@Injectable({
  providedIn: 'root',
})
export class FocusModeService {
  private _store = inject(Store);
  private _globalConfigService = inject(GlobalConfigService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);

  // State signals
  currentScreen = toSignal(this._store.select(selectors.selectCurrentScreen));
  mode = toSignal(this._store.select(selectors.selectMode));
  isOverlayShown = toSignal(this._store.select(selectors.selectIsOverlayShown));
  currentCycle = toSignal(this._store.select(selectors.selectCurrentCycle));

  // Timer signals
  isRunning = toSignal(this._store.select(selectors.selectIsRunning));
  timeElapsed = toSignal(this._store.select(selectors.selectTimeElapsed));
  timeRemaining = toSignal(this._store.select(selectors.selectTimeRemaining));
  progress = toSignal(this._store.select(selectors.selectProgress));

  // Session signals
  isSessionRunning = toSignal(this._store.select(selectors.selectIsSessionRunning));
  isSessionPaused = toSignal(this._store.select(selectors.selectIsSessionPaused));

  // Break signals
  isBreakActive = toSignal(this._store.select(selectors.selectIsBreakActive));
  isLongBreak = toSignal(this._store.select(selectors.selectIsLongBreak));

  // Config signals
  pomodoroConfig = this._globalConfigService.pomodoroConfig;
  focusModeConfig = toSignal(this._store.select(selectFocusModeConfig));

  // Compatibility aliases (TODO: remove when components are updated)
  isBreakLong = this.isLongBreak;

  // Additional compatibility signals
  lastSessionTotalDurationOrTimeElapsedFallback = toSignal(
    this._store.select(selectors.selectLastSessionDuration),
    { initialValue: 0 },
  );

  // UI helper signals
  isCountTimeDown = computed(() => this.mode() !== FocusModeMode.Flowtime);

  // Observable versions for compatibility
  sessionProgress$ = this._store.select(selectors.selectProgress);
  currentSessionTime$ = this._store.select(selectors.selectTimeElapsed);
  timeToGo$ = this._store.select(selectors.selectTimeRemaining);

  // Single timer that updates the store
  constructor() {
    // Start the timer subscription with proper cleanup
    this._globalTrackingIntervalService.tick$
      .pipe(
        filter(() => this.isRunning() === true),
        tap(() => this._store.dispatch(actions.tick())),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
}
