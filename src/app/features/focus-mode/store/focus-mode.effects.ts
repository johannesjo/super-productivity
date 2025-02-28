import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  cancelFocusSession,
  focusSessionDone,
  pauseFocusSession,
  setFocusModeMode,
  setFocusSessionActivePage,
  setFocusSessionTimeElapsed,
  showFocusOverlay,
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
                ofType(focusSessionDone),
                tap(() => playSound(SESSION_DONE_SOUND, 100)),
              )
            : EMPTY,
        ),
      ),
    { dispatch: false },
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

  setTaskBarIconProgress$: any =
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

  focusWindowOnSessionDone$: any =
    IS_ELECTRON &&
    createEffect(
      () =>
        this._actions$.pipe(
          ofType(focusSessionDone),
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
}
