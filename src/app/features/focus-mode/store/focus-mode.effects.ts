import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, EMPTY } from 'rxjs';
import {
  map,
  switchMap,
  withLatestFrom,
  filter,
  tap,
  distinctUntilChanged,
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
import { FocusModeMode } from '../focus-mode.model';

const SESSION_DONE_SOUND = 'positive.ogg';

@Injectable()
export class FocusModeEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private strategyFactory = inject(FocusModeStrategyFactory);
  private globalConfigService = inject(GlobalConfigService);
  private taskService = inject(TaskService);

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

  // Handle session completion
  sessionComplete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.focusSessionDone),
      withLatestFrom(
        this.store.select(selectors.selectMode),
        this.store.select(selectors.selectCurrentCycle),
        this.globalConfigService.sound$,
      ),
      switchMap(([_, mode, cycle, soundCfg]) => {
        const strategy = this.strategyFactory.getStrategy(mode);
        const actionsToDispatch: any[] = [];

        // Play sound if enabled
        if (soundCfg.volume > 0) {
          playSound(SESSION_DONE_SOUND, soundCfg.volume);
        }

        // Check if we should start a break
        if (strategy.shouldStartBreakAfterSession) {
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

          // For Pomodoro, increment cycle
          if (mode === FocusModeMode.Pomodoro) {
            actionsToDispatch.push(actions.incrementCycle());
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
        this.globalConfigService.pomodoroConfig$,
        this.globalConfigService.sound$,
      ),
      switchMap(([_, mode, pomodoroCfg, soundCfg]) => {
        const strategy = this.strategyFactory.getStrategy(mode);

        // Play sound if enabled
        if (pomodoroCfg.isPlaySoundAfterBreak && soundCfg.volume > 0) {
          playSound(SESSION_DONE_SOUND, soundCfg.volume);
        }

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

  // Handle compatibility startFocusSession action
  startFocusSessionCompat$ = createEffect(() =>
    this.actions$.pipe(
      ofType('[FocusMode] Start Focus Session'),
      withLatestFrom(this.store.select(selectors.selectMode)),
      switchMap(([_, mode]) => {
        const strategy = this.strategyFactory.getStrategy(mode);
        const duration = strategy.initialSessionDuration;
        return of(actions.startFocusSession({ duration }));
      }),
    ),
  );

  // Pause on idle
  pauseOnIdle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(openIdleDialog),
      map(() => actions.pauseFocusSession()),
    ),
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

  // Electron-specific effects
  setTaskBarProgress$ = IS_ELECTRON
    ? createEffect(
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
      )
    : null;

  focusWindowOnComplete$ = IS_ELECTRON
    ? createEffect(
        () =>
          this.actions$.pipe(
            ofType(actions.focusSessionDone),
            tap(() => {
              window.ea.showOrFocus();
              window.ea.flashFrame();
              window.ea.setProgressBar({
                progress: 1,
                progressBarMode: 'normal',
              });
            }),
          ),
        { dispatch: false },
      )
    : null;
}
