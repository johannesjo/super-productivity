import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  cancelFocusSession,
  focusSessionDone,
  setFocusSessionActivePage,
  setFocusSessionTimeToGo,
  showFocusOverlay,
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
  pairwise,
  scan,
  switchMap,
  switchMapTo,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { EMPTY, interval, merge, Observable, of } from 'rxjs';
import { TaskService } from '../../tasks/task.service';
import {
  selectFocusSessionDuration,
  selectFocusSessionProgress,
  selectIsFocusSessionRunning,
} from './focus-mode.selectors';
import { Store } from '@ngrx/store';
import { unsetCurrentTask } from '../../tasks/store/task.actions';
import { playSound } from '../../../util/play-sound';
import { IS_ELECTRON } from '../../../app.constants';
import { ipcRenderer } from 'electron';
import { IPC } from '../../../../../electron/shared-with-frontend/ipc-events.const';
import { ElectronService } from '../../../core/electron/electron.service';
import { IdleService } from '../../idle/idle.service';
import { FocusModePage } from '../focus-mode.const';

const TICK_DURATION = 500;
const SESSION_DONE_SOUND = 'positive.ogg';

// const DEFAULT_TICK_SOUND = 'tick.mp3';

@Injectable()
export class FocusModeEffects {
  private _isRunning$ = this._store.select(selectIsFocusSessionRunning);
  private _sessionDuration$ = this._store.select(selectFocusSessionDuration);
  private _sessionProgress$ = this._store.select(selectFocusSessionProgress);

  private _timer$: Observable<number> = interval(TICK_DURATION).pipe(
    switchMap(() => of(Date.now())),
    pairwise(),
    map(([a, b]) => b - a),
  );

  private _tick$: Observable<number> = this._isRunning$.pipe(
    switchMap((isRunning) => (isRunning ? this._timer$ : EMPTY)),
    map((tick) => tick * -1),
  );

  private _currentSessionTime$: Observable<number> = merge(
    this._sessionDuration$,
    this._tick$,
    this._actions$.pipe(
      ofType(startFocusSession, cancelFocusSession),
      switchMap(() => this._sessionDuration$.pipe(first())),
    ),
  ).pipe(
    scan((acc, value) => {
      return value < 0 ? acc + value : value;
    }),
  );

  autoStartFocusMode$ = createEffect(() => {
    return this._globalConfigService.misc$.pipe(
      switchMap((misc) =>
        misc.isAlwaysUseFocusMode
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
    return this._currentSessionTime$.pipe(
      map((focusSessionTimeToGo) =>
        focusSessionTimeToGo >= 0
          ? setFocusSessionTimeToGo({ focusSessionTimeToGo })
          : focusSessionDone(),
      ),
    );
  });
  stopTrackingOnOnCancel$ = createEffect(() => {
    return this._actions$.pipe(ofType(cancelFocusSession), mapTo(unsetCurrentTask()));
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
        this._sessionProgress$.pipe(
          withLatestFrom(this._isRunning$),
          tap(([progress, isRunning]: [number, boolean]) => {
            const progressBarMode: 'normal' | 'pause' = isRunning ? 'normal' : 'pause';
            (this._electronService.ipcRenderer as typeof ipcRenderer).send(
              IPC.SET_PROGRESS_BAR,
              {
                progress,
                progressBarMode,
              },
            );
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
            (this._electronService.ipcRenderer as typeof ipcRenderer).send(
              IPC.SHOW_OR_FOCUS,
            );
            (this._electronService.ipcRenderer as typeof ipcRenderer).send(
              IPC.FLASH_FRAME,
            );
            (this._electronService.ipcRenderer as typeof ipcRenderer).send(
              IPC.SET_PROGRESS_BAR,
              {
                progress: 100,
                progressBarMode: 'normal',
              },
            );
          }),
        ),
      { dispatch: false },
    );

  constructor(
    private _store: Store,
    private _actions$: Actions,
    private _idleService: IdleService,
    private _globalConfigService: GlobalConfigService,
    private _taskService: TaskService,
    private _electronService: ElectronService,
  ) {}
}
