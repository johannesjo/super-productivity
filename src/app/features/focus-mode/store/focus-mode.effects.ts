import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, of } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import * as actions from './focus-mode.actions';
import * as selectors from './focus-mode.selectors';
import { FocusModeStrategyFactory } from '../focus-mode-strategies';
import { GlobalConfigService } from '../../config/global-config.service';
import { TaskService } from '../../tasks/task.service';
import { playSound } from '../../../util/play-sound';
import { IS_ELECTRON } from '../../../app.constants';
import { setCurrentTask, unsetCurrentTask } from '../../tasks/store/task.actions';
import { openIdleDialog } from '../../idle/store/idle.actions';
import { LS } from '../../../core/persistence/storage-keys.const';
import {
  selectFocusModeConfig,
  selectPomodoroConfig,
} from '../../config/store/global-config.reducer';
import { updateGlobalConfigSection } from '../../config/store/global-config.actions';
import { FocusModeMode, FocusScreen, TimerState } from '../focus-mode.model';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';
import { T } from '../../../t.const';
import { showFocusOverlay } from './focus-mode.actions';
import { cancelFocusSession } from './focus-mode.actions';
import { combineLatest } from 'rxjs';
import { MetricService } from '../../metric/metric.service';
import { FocusModeStorageService } from '../focus-mode-storage.service';

const SESSION_DONE_SOUND = 'positive.ogg';
const TICK_SOUND = 'tick.mp3';

@Injectable()
export class FocusModeEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private strategyFactory = inject(FocusModeStrategyFactory);
  private globalConfigService = inject(GlobalConfigService);
  private taskService = inject(TaskService);
  private bannerService = inject(BannerService);
  private metricService = inject(MetricService);
  private storageService = inject(FocusModeStorageService);

  // Auto-show overlay when task is selected (if always use focus mode is enabled)
  // Skip showing overlay if isStartInBackground is enabled
  autoShowOverlay$ = createEffect(() =>
    this.store.select(selectFocusModeConfig).pipe(
      switchMap((cfg) =>
        cfg?.isAlwaysUseFocusMode && !cfg?.isStartInBackground
          ? this.taskService.currentTaskId$.pipe(
              distinctUntilChanged(),
              filter((id) => !!id),
              map(() => actions.showFocusOverlay()),
            )
          : EMPTY,
      ),
    ),
  );

  // Auto-start focus session when task is selected (if auto-start is enabled)
  // Only triggers on NEW task selections, not when timer state changes
  autoStartSession$ = createEffect(() =>
    this.store.select(selectFocusModeConfig).pipe(
      switchMap((cfg) =>
        cfg?.isAlwaysUseFocusMode && cfg?.isAutoStartSession
          ? this.taskService.currentTaskId$.pipe(
              distinctUntilChanged(),
              filter((taskId) => !!taskId),
              withLatestFrom(
                this.store.select(selectors.selectTimer),
                this.store.select(selectors.selectMode),
                this.store.select(selectors.selectCurrentScreen),
              ),
              filter(
                ([_taskId, timer, _mode, currentScreen]) =>
                  timer.purpose === null &&
                  !timer.isRunning &&
                  // Only auto-start from Main screen (preparation state), not from SessionDone/Break
                  currentScreen === FocusScreen.Main,
              ),
              switchMap(([_taskId, _timer, mode]) => {
                const strategy = this.strategyFactory.getStrategy(mode);
                const duration = strategy.initialSessionDuration;
                return of(actions.startFocusSession({ duration }));
              }),
            )
          : EMPTY,
      ),
    ),
  );

  // Detect when work session timer completes and dispatch completeFocusSession
  detectSessionCompletion$ = createEffect(() =>
    this.store.select(selectors.selectTimer).pipe(
      withLatestFrom(this.store.select(selectors.selectMode)),
      filter(
        ([timer, mode]) =>
          timer.purpose === 'work' &&
          !timer.isRunning &&
          timer.duration > 0 &&
          timer.elapsed >= timer.duration &&
          mode !== FocusModeMode.Flowtime, // Flowtime sessions should never auto-complete
      ),
      distinctUntilChanged(
        ([prevTimer], [currTimer]) =>
          prevTimer.elapsed === currTimer.elapsed &&
          prevTimer.startedAt === currTimer.startedAt,
      ),
      map(() => actions.completeFocusSession({ isManual: false })),
    ),
  );

  // Detect when break timer completes and show notification (no auto-complete)
  detectBreakTimeUp$ = createEffect(
    () =>
      this.store.select(selectors.selectTimer).pipe(
        filter(
          (timer) =>
            timer.purpose === 'break' &&
            !timer.isRunning &&
            timer.duration > 0 &&
            timer.elapsed >= timer.duration,
        ),
        distinctUntilChanged(
          (prev, curr) =>
            prev.elapsed === curr.elapsed && prev.startedAt === curr.startedAt,
        ),
        tap(() => {
          this._notifyUser();
        }),
      ),
    { dispatch: false },
  );

  // Handle session completion
  sessionComplete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.completeFocusSession),
      withLatestFrom(
        this.store.select(selectors.selectMode),
        this.store.select(selectors.selectCurrentCycle),
        this.store.select(selectFocusModeConfig),
        this.taskService.currentTaskId$,
      ),
      switchMap(([action, mode, cycle, focusModeConfig, currentTaskId]) => {
        const strategy = this.strategyFactory.getStrategy(mode);
        const actionsToDispatch: any[] = [];

        // Show notification (sound + window focus)
        this._notifyUser();

        // For Pomodoro mode, always increment cycle after session completion
        if (mode === FocusModeMode.Pomodoro) {
          actionsToDispatch.push(actions.incrementCycle());
        }

        // Check if we should start a break - only for automatic completions
        // Manual completions should stay on SessionDone screen
        if (!action.isManual && strategy.shouldStartBreakAfterSession) {
          // Pause task tracking during break if enabled
          const shouldPauseTracking =
            focusModeConfig?.isPauseTrackingDuringBreak && currentTaskId;
          if (shouldPauseTracking) {
            actionsToDispatch.push(unsetCurrentTask());
          }

          // Get break duration from strategy
          const breakInfo = strategy.getBreakDuration(cycle);
          if (breakInfo) {
            actionsToDispatch.push(
              actions.startBreak({
                duration: breakInfo.duration,
                isLongBreak: breakInfo.isLong,
                pausedTaskId: shouldPauseTracking ? currentTaskId : undefined,
              }),
            );
          } else {
            // Fallback if no break info (shouldn't happen for Pomodoro)
            actionsToDispatch.push(
              actions.startBreak({
                pausedTaskId: shouldPauseTracking ? currentTaskId : undefined,
              }),
            );
          }
        }

        return actionsToDispatch.length > 0 ? of(...actionsToDispatch) : EMPTY;
      }),
    ),
  );

  // Handle break completion
  breakComplete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.completeBreak),
      withLatestFrom(
        this.store.select(selectors.selectMode),
        this.store.select(selectors.selectPausedTaskId),
      ),
      switchMap(([_, mode, pausedTaskId]) => {
        const strategy = this.strategyFactory.getStrategy(mode);
        const actionsToDispatch: any[] = [];

        // Show notification (sound + window focus)
        this._notifyUser();

        // Resume task tracking if we paused it during break
        if (pausedTaskId) {
          actionsToDispatch.push(setCurrentTask({ id: pausedTaskId }));
        }

        // Auto-start next session if configured
        if (strategy.shouldAutoStartNextSession) {
          const duration = strategy.initialSessionDuration;
          actionsToDispatch.push(actions.startFocusSession({ duration }));
        }

        return actionsToDispatch.length > 0 ? of(...actionsToDispatch) : EMPTY;
      }),
    ),
  );

  // Handle skip break
  skipBreak$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.skipBreak),
      withLatestFrom(
        this.store.select(selectors.selectMode),
        this.store.select(selectors.selectPausedTaskId),
      ),
      switchMap(([_, mode, pausedTaskId]) => {
        const strategy = this.strategyFactory.getStrategy(mode);
        const actionsToDispatch: any[] = [];

        // Resume task tracking if we paused it during break
        if (pausedTaskId) {
          actionsToDispatch.push(setCurrentTask({ id: pausedTaskId }));
        }

        // Auto-start next session if configured
        if (strategy.shouldAutoStartNextSession) {
          const duration = strategy.initialSessionDuration;
          actionsToDispatch.push(actions.startFocusSession({ duration }));
        }

        return actionsToDispatch.length > 0 ? of(...actionsToDispatch) : EMPTY;
      }),
    ),
  );

  // Handle session cancellation
  cancelSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.cancelFocusSession),
      map(() => unsetCurrentTask()),
    ),
  );

  // Pause on idle
  pauseOnIdle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(openIdleDialog),
      map(() => actions.pauseFocusSession()),
    ),
  );

  logFocusSession$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(actions.completeFocusSession),
        withLatestFrom(this.store.select(selectors.selectLastSessionDuration)),
        tap(([, duration]) => {
          if (duration > 0) {
            this.metricService.logFocusSession(duration);
          }
        }),
      ),
    { dispatch: false },
  );

  // Persist mode to localStorage
  persistMode$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(actions.setFocusModeMode),
        tap(({ mode }) => {
          localStorage.setItem(LS.FOCUS_MODE_MODE, mode);
        }),
      ),
    { dispatch: false },
  );

  persistCountdownDuration$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(actions.setFocusSessionDuration),
        withLatestFrom(this.store.select(selectors.selectMode)),
        tap(([{ focusSessionDuration }, mode]) => {
          if (mode === FocusModeMode.Countdown && focusSessionDuration > 0) {
            this.storageService.setLastCountdownDuration(focusSessionDuration);
          }
        }),
      ),
    { dispatch: false },
  );

  syncDurationWithMode$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.setFocusModeMode, actions.focusModeLoaded),
      withLatestFrom(
        this.store.select(selectors.selectTimer),
        this.store.select(selectors.selectMode),
      ),
      switchMap(([action, timer, storeMode]) => {
        const mode =
          action.type === actions.setFocusModeMode.type
            ? (action as ReturnType<typeof actions.setFocusModeMode>).mode
            : storeMode;

        if (timer.purpose !== null) {
          return EMPTY;
        }

        // Only sync on load if duration is not set (0) to avoid overwriting manual changes
        if (action.type === actions.focusModeLoaded.type && timer.duration > 0) {
          return EMPTY;
        }

        if (mode === FocusModeMode.Flowtime) {
          return EMPTY;
        }

        const strategy = this.strategyFactory.getStrategy(mode);
        const duration = strategy.initialSessionDuration;

        if (
          typeof duration !== 'number' ||
          duration <= 0 ||
          duration === timer.duration
        ) {
          return EMPTY;
        }

        return of(actions.setFocusSessionDuration({ focusSessionDuration: duration }));
      }),
    ),
  );

  // Sync duration when Pomodoro settings change (only for unstarted sessions)
  syncDurationWithPomodoroConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateGlobalConfigSection),
      filter(({ sectionKey }) => sectionKey === 'pomodoro'),
      withLatestFrom(
        this.store.select(selectors.selectTimer),
        this.store.select(selectors.selectMode),
        this.store.select(selectPomodoroConfig),
      ),
      switchMap(([_action, timer, mode, pomodoroConfig]) => {
        // Only sync if session hasn't started yet
        if (timer.purpose !== null) {
          return EMPTY;
        }

        // Only sync for Pomodoro mode
        if (mode !== FocusModeMode.Pomodoro) {
          return EMPTY;
        }

        const newDuration = pomodoroConfig?.duration;

        // Only sync if duration is valid and divisible by 1000 (whole seconds)
        if (
          typeof newDuration !== 'number' ||
          newDuration <= 0 ||
          newDuration % 1000 !== 0 ||
          newDuration === timer.duration
        ) {
          return EMPTY;
        }

        return of(actions.setFocusSessionDuration({ focusSessionDuration: newDuration }));
      }),
    ),
  );

  // Electron-specific effects
  setTaskBarProgress$ =
    IS_ELECTRON &&
    createEffect(
      () =>
        this.store.select(selectors.selectProgress).pipe(
          withLatestFrom(this.store.select(selectors.selectIsRunning)),
          tap(([progress, isRunning]) => {
            window.ea.setProgressBar({
              progress: progress / 100,
              progressBarMode: isRunning ? 'normal' : 'pause',
            });
          }),
        ),
      { dispatch: false },
    );

  focusWindowOnBreakStart$ =
    IS_ELECTRON &&
    createEffect(
      () =>
        this.actions$.pipe(
          ofType(actions.startBreak),
          tap(() => {
            this._notifyUser(true);
          }),
        ),
      { dispatch: false },
    );

  // Update banner when session or break state changes
  updateBanner$ = createEffect(
    () =>
      combineLatest([
        this.store.select(selectors.selectIsSessionRunning),
        this.store.select(selectors.selectIsBreakActive),
        this.store.select(selectors.selectIsSessionCompleted),
        this.store.select(selectors.selectMode),
        this.store.select(selectors.selectCurrentCycle),
        this.store.select(selectors.selectIsOverlayShown),
        this.store.select(selectors.selectTimer),
      ]).pipe(
        map(
          (
            values,
          ): [boolean, boolean, boolean, FocusModeMode, number, boolean, TimerState] =>
            values as [
              boolean,
              boolean,
              boolean,
              FocusModeMode,
              number,
              boolean,
              TimerState,
            ],
        ),
        tap(
          ([
            isSessionRunning,
            isOnBreak,
            isSessionCompleted,
            mode,
            cycle,
            isOverlayShown,
            timer,
          ]) => {
            // Only show banner when overlay is hidden
            if (isOverlayShown) {
              this.bannerService.dismiss(BannerId.FocusMode);
              return;
            }

            if (isSessionRunning || isOnBreak || isSessionCompleted) {
              // Determine banner message based on session type
              let translationKey: string;
              let icon: string;
              let timer$;
              let progress$;

              if (isSessionCompleted) {
                // Session is completed
                translationKey =
                  mode === FocusModeMode.Pomodoro
                    ? T.F.FOCUS_MODE.POMODORO_SESSION_COMPLETED
                    : T.F.FOCUS_MODE.SESSION_COMPLETED;
                icon = 'check_circle';
                timer$ = undefined; // No timer needed for completed state
                progress$ = undefined; // No progress bar needed
              } else if (isOnBreak) {
                // Check if break time is up
                const isBreakTimeUp =
                  timer.purpose === 'break' &&
                  !timer.isRunning &&
                  timer.duration > 0 &&
                  timer.elapsed >= timer.duration;

                if (isBreakTimeUp) {
                  // Break is done - time is up
                  translationKey = T.F.POMODORO.BREAK_IS_DONE;
                  icon = 'notifications';
                  timer$ = undefined; // No timer needed for done state
                  progress$ = undefined; // No progress bar needed
                } else {
                  // Break is still running
                  translationKey =
                    mode === FocusModeMode.Pomodoro
                      ? T.F.FOCUS_MODE.B.POMODORO_BREAK_RUNNING
                      : T.F.FOCUS_MODE.B.BREAK_RUNNING;
                  icon = 'free_breakfast';
                  timer$ = this.store.select(selectors.selectTimeRemaining);
                  progress$ = this.store.select(selectors.selectProgress);
                }
              } else {
                // Work session is active
                const isCountTimeUp = mode === FocusModeMode.Flowtime;
                translationKey =
                  mode === FocusModeMode.Pomodoro
                    ? T.F.FOCUS_MODE.B.POMODORO_SESSION_RUNNING
                    : T.F.FOCUS_MODE.B.SESSION_RUNNING;
                icon = 'center_focus_strong';
                timer$ = isCountTimeUp
                  ? this.store.select(selectors.selectTimeElapsed)
                  : this.store.select(selectors.selectTimeRemaining);
                progress$ = isCountTimeUp
                  ? undefined
                  : this.store.select(selectors.selectProgress);
              }

              const translateParams =
                mode === FocusModeMode.Pomodoro ? { cycleNr: cycle || 1 } : undefined;

              this.bannerService.open({
                id: BannerId.FocusMode,
                ico: icon,
                msg: translationKey,
                translateParams,
                timer$,
                progress$,
                action2: {
                  label: T.F.FOCUS_MODE.B.TO_FOCUS_OVERLAY,
                  fn: () => {
                    this.store.dispatch(showFocusOverlay());
                  },
                },
                // Only show Cancel button when session is not completed
                ...(isSessionCompleted
                  ? {}
                  : {
                      action: {
                        label: T.G.CANCEL,
                        fn: () => {
                          this.store.dispatch(cancelFocusSession());
                        },
                      },
                    }),
              });
            } else {
              this.bannerService.dismiss(BannerId.FocusMode);
            }
          },
        ),
      ),
    { dispatch: false },
  );

  // Play ticking sound during focus sessions if enabled
  playTickSound$ = createEffect(
    () =>
      this.store.select(selectors.selectTimer).pipe(
        filter(
          (timer) => timer.isRunning && timer.purpose === 'work' && timer.elapsed > 0,
        ),
        // Only emit when we cross a second boundary
        distinctUntilChanged(
          (prev, curr) =>
            Math.floor(prev.elapsed / 1000) === Math.floor(curr.elapsed / 1000),
        ),
        withLatestFrom(this.store.select(selectFocusModeConfig)),
        tap(([, focusModeConfig]) => {
          const soundVolume = this.globalConfigService.sound()?.volume || 0;
          if (focusModeConfig?.isPlayTick && soundVolume > 0) {
            // Play at reduced volume (40% of main volume) to not be too intrusive
            playSound(TICK_SOUND, Math.round(soundVolume * 0.4));
          }
        }),
      ),
    { dispatch: false },
  );

  private _notifyUser(isHideBar = false): void {
    const soundVolume = this.globalConfigService.sound()?.volume || 0;

    // Play sound if enabled
    if (soundVolume > 0) {
      playSound(SESSION_DONE_SOUND, soundVolume);
    }

    // Focus window if in Electron
    if (IS_ELECTRON) {
      window.ea.showOrFocus();
      window.ea.flashFrame();
      window.ea.setProgressBar({
        progress: 1,
        progressBarMode: isHideBar ? 'none' : 'normal',
      });
    }
  }
}
