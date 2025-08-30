import { computed, inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, tap } from 'rxjs/operators';
import * as actions from './store/focus-mode.actions';
import * as selectors from './store/focus-mode.selectors';
import { GlobalConfigService } from '../config/global-config.service';
import { selectFocusModeConfig } from '../config/store/global-config.reducer';
import { GlobalTrackingIntervalService } from '../../core/global-tracking-interval/global-tracking-interval.service';
import { FocusModePage, FocusModePhaseType, FocusModeMode } from './focus-mode.model';

@Injectable({
  providedIn: 'root',
})
export class FocusModeService {
  private _store = inject(Store);
  private _globalConfigService = inject(GlobalConfigService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);

  // State signals
  phase = toSignal(this._store.select(selectors.selectPhase));
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
  isSessionContextActive = toSignal(
    this._store.select(selectors.selectIsSessionContextActive),
  );
  isSessionPaused = toSignal(this._store.select(selectors.selectIsSessionPaused));

  // Break signals
  isBreakActive = toSignal(this._store.select(selectors.selectIsBreakActive));
  isLongBreak = toSignal(this._store.select(selectors.selectIsLongBreak));
  isBreakLong = toSignal(this._store.select(selectors.selectIsLongBreak)); // Alias for compatibility

  // Break-specific timer signals (for compatibility)
  breakTimeElapsed = toSignal(this._store.select(selectors.selectTimeElapsed), {
    initialValue: 0,
  });
  breakDuration = toSignal(this._store.select(selectors.selectTimeDuration), {
    initialValue: 5 * 60 * 1000,
  });
  breakProgress = toSignal(this._store.select(selectors.selectProgress), {
    initialValue: 0,
  });

  // Config signals
  pomodoroConfig = this._globalConfigService.pomodoroConfig;
  focusModeConfig = toSignal(this._store.select(selectFocusModeConfig));
  cfg = this.focusModeConfig; // Alias for compatibility
  pomodoroCfg = this.pomodoroConfig; // Alias for compatibility

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

  activePage = toSignal(
    this._store.select(selectors.selectFocusModeState).pipe(
      map((state) => {
        if (state.isOverlayShown) {
          switch (state.phase.type) {
            case FocusModePhaseType.TaskSelection:
              return FocusModePage.TaskSelection;
            case FocusModePhaseType.DurationSelection:
              return FocusModePage.DurationSelection;
            case FocusModePhaseType.Preparation:
              return FocusModePage.Preparation;
            case FocusModePhaseType.Session:
              return FocusModePage.Main;
            case FocusModePhaseType.SessionDone:
              return FocusModePage.SessionDone;
            case FocusModePhaseType.Break:
              return FocusModePage.Break;
            default:
              return FocusModePage.TaskSelection;
          }
        }
        return FocusModePage.TaskSelection;
      }),
    ),
    { initialValue: FocusModePage.TaskSelection },
  );

  // Single timer that updates the store
  private timer$ = this._globalTrackingIntervalService.tick$.pipe(
    filter(() => this.isRunning() === true),
    tap(() => this._store.dispatch(actions.tick())),
  );

  constructor() {
    // Start the timer subscription
    this.timer$.subscribe();
  }
}
