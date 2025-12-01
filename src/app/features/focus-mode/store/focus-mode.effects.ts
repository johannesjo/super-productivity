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
import { unsetCurrentTask } from '../../tasks/store/task.actions';
import { openIdleDialog } from '../../idle/store/idle.actions';
import { LS } from '../../../core/persistence/storage-keys.const';
import { selectFocusModeConfig } from '../../config/store/global-config.reducer';
import { FocusModeMode, TimerState } from '../focus-mode.model';
import { BannerService } from '../../../core/banner/banner.service';
import { BannerId } from '../../../core/banner/banner.model';
import { T } from '../../../t.const';
import { showFocusOverlay } from './focus-mode.actions';
import { cancelFocusSession } from './focus-mode.actions';
import { combineLatest } from 'rxjs';
import { MetricService } from '../../metric/metric.service';
import { FocusModeStorageService } from '../focus-mode-storage.service';

const SESSION_DONE_SOUND = 'positive.ogg';

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
  autoShowOverlay$ = createEffect(() =>
    this.store.select(selectFocusModeConfig).pipe(
      switchMap((cfg) =>
        cfg?.isAlwaysUseFocusMode
          ? this.taskService.currentTaskId$.pipe(
              distinctUntilChanged(),
              filter((id) => !!id),
              map(() => actions.showFocusOverlay()),
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
      ),
      switchMap(([action, mode, cycle]) => {
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
          // Get break duration from strategy
          const breakInfo = strategy.getBreakDuration(cycle);
          if (breakInfo) {
            actionsToDispatch.push(
              actions.startBreak({
                duration: breakInfo.duration,
                isLongBreak: breakInfo.isLong,
              }),
            );
          } else {
            // Fallback if no break info (shouldn't happen for Pomodoro)
            actionsToDispatch.push(actions.startBreak({}));
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
      withLatestFrom(this.store.select(selectors.selectMode)),
      switchMap(([_, mode]) => {
        const strategy = this.strategyFactory.getStrategy(mode);

        // Show notification (sound + window focus)
        this._notifyUser();

        // Auto-start next session if configured
        if (strategy.shouldAutoStartNextSession) {
          const duration = strategy.initialSessionDuration;
          return of(actions.startFocusSession({ duration }));
        }

        return EMPTY;
      }),
    ),
  );

  // Handle skip break
  skipBreak$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.skipBreak),
      withLatestFrom(this.store.select(selectors.selectMode)),
      switchMap(([_, mode]) => {
        const strategy = this.strategyFactory.getStrategy(mode);

        // Auto-start next session if configured
        if (strategy.shouldAutoStartNextSession) {
          const duration = strategy.initialSessionDuration;
          return of(actions.startFocusSession({ duration }));
        }

        return EMPTY;
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
