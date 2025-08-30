import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  cancelFocusSession,
  focusSessionDone,
  focusTaskDone,
  pauseFocusSession,
  setFocusModeMode,
  setFocusSessionActivePage,
  setFocusSessionDuration,
  setFocusSessionTimeElapsed,
  showFocusOverlay,
  startBreak,
  setBreakTimeElapsed,
  completeBreak,
  skipBreak,
  incrementCycle,
  startFocusSession,
} from './focus-mode.actions';
import { GlobalConfigService } from '../../config/global-config.service';
import {
  delay,
  distinctUntilChanged,
  filter,
  first,
  map,
  mapTo,
  switchMap,
  switchMapTo,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { EMPTY, Observable, of } from 'rxjs';
import { TaskService } from '../../tasks/task.service';
import {
  selectFocusModeMode,
  selectFocusSessionDuration,
  selectIsFocusSessionRunning,
  selectFocusModeIsBreak,
  selectFocusModeCurrentCycle,
} from './focus-mode.selectors';
import { Store } from '@ngrx/store';
import { unsetCurrentTask } from '../../tasks/store/task.actions';
import { playSound } from '../../../util/play-sound';
import { IS_ELECTRON } from '../../../app.constants';
import { IdleService } from '../../idle/idle.service';
import { FocusModeMode, FocusModePage } from '../focus-mode.const';
import { selectFocusModeConfig } from '../../config/store/global-config.reducer';
import { LS } from '../../../core/persistence/storage-keys.const';
import { openIdleDialog } from '../../idle/store/idle.actions';
import { FocusModeService } from '../focus-mode.service';

const SESSION_DONE_SOUND = 'positive.ogg';

// const DEFAULT_TICK_SOUND = 'tick.mp3';

@Injectable()
export class FocusModeEffects {
  private _focusModeService = inject(FocusModeService);
  private _store = inject(Store);
  private _actions$ = inject(Actions);
  private _idleService = inject(IdleService);
  private _globalConfigService = inject(GlobalConfigService);
  private _taskService = inject(TaskService);

  private _isRunning$ = this._store.select(selectIsFocusSessionRunning);
  // TODO also rename store value maybe
  private _plannedSessionDuration$ = this._store.select(selectFocusSessionDuration);

  autoStartFocusMode$ = createEffect(() => {
    return this._store.select(selectFocusModeConfig).pipe(
      switchMap((cfg) =>
        cfg.isAlwaysUseFocusMode
          ? this._taskService.currentTaskId$.pipe(
              distinctUntilChanged(),
              switchMap((currentTaskId) =>
                currentTaskId ? of(showFocusOverlay()) : EMPTY,
              ),
            )
          : EMPTY,
      ),
    );
  });

  setElapsedTime$ = createEffect(() => {
    return this._focusModeService.currentSessionTime$.pipe(
      withLatestFrom(
        this._store.select(selectFocusModeMode),
        this._focusModeService.timeToGo$,
      ),
      map(([currentSessionTime, mode, timeToGo]) => {
        if (mode === FocusModeMode.Flowtime) {
          return setFocusSessionTimeElapsed({
            focusSessionTimeElapsed: currentSessionTime,
          });
        }
        return timeToGo >= 0
          ? // ? setFocusSessionTimeToGo({ currentSessionTime })
            setFocusSessionTimeElapsed({
              focusSessionTimeElapsed: currentSessionTime,
            })
          : focusSessionDone({ isResetPlannedSessionDuration: true });
      }),
    );
  });

  stopTrackingOnOnCancel$ = createEffect(() => {
    return this._actions$.pipe(ofType(cancelFocusSession), mapTo(unsetCurrentTask()));
  });

  pauseOnIdle$ = createEffect(() => {
    return this._actions$.pipe(ofType(openIdleDialog), mapTo(pauseFocusSession()));
  });

  playSessionDoneSoundIfEnabled$: Observable<unknown> = createEffect(
    () =>
      this._globalConfigService.sound$.pipe(
        switchMap((sndCfg) =>
          sndCfg.volume > 0
            ? this._actions$.pipe(
                ofType(focusSessionDone, focusTaskDone),
                tap(() => playSound(SESSION_DONE_SOUND, 100)),
              )
            : EMPTY,
        ),
      ),
    { dispatch: false },
  );

  // Handle task completion for pomodoro mode - show task selection instead of auto-starting break
  handleTaskDoneForPomodoro$ = createEffect(() =>
    this._actions$.pipe(
      ofType(focusTaskDone),
      withLatestFrom(this._store.select(selectFocusModeMode)),
      filter(([_, mode]) => mode === FocusModeMode.Pomodoro),
      map(() =>
        setFocusSessionActivePage({ focusActivePage: FocusModePage.TaskSelection }),
      ),
    ),
  );

  // TODO check if needed
  handleIdleCurrentTaskDeSelection$: Observable<unknown> = createEffect(() =>
    this._isRunning$.pipe(
      switchMap((isRunning) => (isRunning ? this._idleService.isIdle$ : EMPTY)),
      switchMap((isIdle) =>
        !isIdle ? this._idleService.isIdle$.pipe(distinctUntilChanged()) : EMPTY,
      ),
      // give time to let task be started again
      delay(500),
      switchMapTo(this._taskService.currentTaskId$.pipe(first())),
      filter((currentTaskId) => !currentTaskId),
      map(() =>
        setFocusSessionActivePage({ focusActivePage: FocusModePage.TaskSelection }),
      ),
    ),
  );

  setTaskBarIconProgress$ =
    IS_ELECTRON &&
    createEffect(
      () =>
        this._focusModeService.sessionProgress$.pipe(
          withLatestFrom(this._isRunning$),
          tap(([progress, isRunning]: [number, boolean]) => {
            const progressBarMode: 'normal' | 'pause' = isRunning ? 'normal' : 'pause';
            window.ea.setProgressBar({
              progress: progress / 100,
              progressBarMode,
            });
          }),
        ),
      { dispatch: false },
    );

  focusWindowOnSessionOrTaskDone$ =
    IS_ELECTRON &&
    createEffect(
      () =>
        this._actions$.pipe(
          ofType(focusSessionDone, focusTaskDone),
          tap(() => {
            window.ea.showOrFocus();
            window.ea.flashFrame();
            window.ea.setProgressBar({
              progress: 100,
              progressBarMode: 'normal',
            });
          }),
        ),
      { dispatch: false },
    );

  modeToLS$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(setFocusModeMode),
        tap(({ mode }) => {
          localStorage.setItem(LS.FOCUS_MODE_MODE, mode);
        }),
      ),
    { dispatch: false },
  );

  // Pomodoro break handling
  startBreakAfterPomodoro$ = createEffect(() =>
    this._actions$.pipe(
      ofType(focusSessionDone),
      withLatestFrom(
        this._store.select(selectFocusModeMode),
        this._store.select(selectFocusModeCurrentCycle),
        this._globalConfigService.pomodoroConfig$,
      ),
      filter(([_, mode]) => mode === FocusModeMode.Pomodoro),
      switchMap(([_, __, currentCycle, config]) => {
        const isLongBreak = currentCycle % config.cyclesBeforeLongerBreak === 0;
        const breakDuration =
          (isLongBreak ? config.longerBreakDuration : config.breakDuration) || 300000;

        if (config.isPlaySound) {
          playSound(SESSION_DONE_SOUND, 100);
        }

        return of(startBreak({ isLongBreak, breakDuration }), incrementCycle());
      }),
    ),
  );

  updateBreakTimer$ = createEffect(() =>
    this._focusModeService.currentBreakTime$.pipe(
      withLatestFrom(
        this._store.select(selectFocusModeIsBreak),
        this._focusModeService.breakTimeToGo$,
      ),
      filter(([_, isBreak]) => isBreak),
      map(([elapsed, __, remaining]) =>
        remaining > 0
          ? setBreakTimeElapsed({ breakTimeElapsed: elapsed })
          : completeBreak(),
      ),
    ),
  );

  continueAfterBreak$ = createEffect(() =>
    this._actions$.pipe(
      ofType(completeBreak, skipBreak),
      withLatestFrom(this._globalConfigService.pomodoroConfig$),
      switchMap(([action, config]) => {
        // Only play sound for natural completion, not skip
        if (action.type === completeBreak.type && config.isPlaySoundAfterBreak) {
          playSound(SESSION_DONE_SOUND, 100);
        }

        // Set the correct Pomodoro duration before starting the next session
        const duration = config.duration || 25 * 60 * 1000;
        return of(
          setFocusSessionDuration({ focusSessionDuration: duration }),
          startFocusSession(),
        );
      }),
    ),
  );
}
