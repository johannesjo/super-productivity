import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import {
  SetCurrentTask,
  TaskActionTypes,
  ToggleStart,
  UnsetCurrentTask,
} from '../../tasks/store/task.actions';
import { concatMap, filter, mapTo, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { PomodoroService } from '../pomodoro.service';
import { PomodoroConfig } from '../../config/global-config.model';
import {
  FinishPomodoroSession,
  PausePomodoro,
  PomodoroActionTypes,
  SkipPomodoroBreak,
  StartPomodoro,
} from './pomodoro.actions';
import { MatDialog } from '@angular/material/dialog';
import { DialogPomodoroBreakComponent } from '../dialog-pomodoro-break/dialog-pomodoro-break.component';
import { Action, select, Store } from '@ngrx/store';
import { selectCurrentTaskId } from '../../tasks/store/task.selectors';
import { EMPTY, Observable, of } from 'rxjs';
import { NotifyService } from '../../../core/notify/notify.service';
import { IS_ELECTRON } from '../../../app.constants';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { ElectronService } from '../../../core/electron/electron.service';
import { ipcRenderer } from 'electron';
import { IPC } from '../../../../../electron/ipc-events.const';

@Injectable()
export class PomodoroEffects {
  currentTaskId$: Observable<string | null> = this._store$.pipe(
    select(selectCurrentTaskId),
  );

  @Effect()
  playPauseOnCurrentUpdate$: Observable<Action> = this._pomodoroService.isEnabled$.pipe(
    switchMap((isEnabledI) =>
      !isEnabledI
        ? EMPTY
        : this._actions$.pipe(
            ofType(TaskActionTypes.SetCurrentTask, TaskActionTypes.UnsetCurrentTask),
            withLatestFrom(
              this._pomodoroService.cfg$,
              this._pomodoroService.isBreak$,
              this._pomodoroService.currentSessionTime$,
            ),
            // don't update when on break and stop time tracking is active
            filter(
              ([action, cfg, isBreak, currentSessionTime]: [
                SetCurrentTask | UnsetCurrentTask,
                PomodoroConfig,
                boolean,
                number,
              ]) =>
                !isBreak ||
                !cfg.isStopTrackingOnBreak ||
                (isBreak &&
                  currentSessionTime <= 0 &&
                  action.type === TaskActionTypes.SetCurrentTask),
            ),
            concatMap(([action, , isBreak, currentSessionTime]) => {
              const payload = (action as any).payload;

              if (payload && action.type !== TaskActionTypes.UnsetCurrentTask) {
                if (isBreak && currentSessionTime <= 0) {
                  return of(new FinishPomodoroSession(), new StartPomodoro());
                }
                return of(new StartPomodoro());
              } else {
                return of(new PausePomodoro({ isBreakEndPause: false }));
              }
            }),
          ),
    ),
  );

  @Effect()
  autoStartNextOnSessionStartIfNotAlready$: Observable<unknown> = this._pomodoroService.isEnabled$.pipe(
    switchMap((isEnabledI) =>
      !isEnabledI
        ? EMPTY
        : this._actions$.pipe(
            ofType(
              PomodoroActionTypes.FinishPomodoroSession,
              PomodoroActionTypes.SkipPomodoroBreak,
            ),
            withLatestFrom(this._pomodoroService.isBreak$, this.currentTaskId$),
            filter(
              ([action, isBreak, currentTaskId]: [
                FinishPomodoroSession,
                boolean,
                string | null,
              ]) => !isBreak && !currentTaskId,
            ),
            mapTo(new ToggleStart()),
          ),
    ),
  );

  @Effect()
  stopPomodoro$: Observable<unknown> = this._pomodoroService.isEnabled$.pipe(
    switchMap((isEnabledI) =>
      !isEnabledI
        ? EMPTY
        : this._actions$.pipe(
            ofType(PomodoroActionTypes.StopPomodoro),
            mapTo(new UnsetCurrentTask()),
          ),
    ),
  );

  @Effect()
  pauseTimeTrackingIfOptionEnabled$: Observable<unknown> = this._pomodoroService.isEnabled$.pipe(
    switchMap((isEnabledI) =>
      !isEnabledI
        ? EMPTY
        : this._actions$.pipe(
            ofType(PomodoroActionTypes.FinishPomodoroSession),
            withLatestFrom(this._pomodoroService.cfg$, this._pomodoroService.isBreak$),
            filter(
              ([action, cfg, isBreak]: [
                FinishPomodoroSession,
                PomodoroConfig,
                boolean,
              ]) => cfg.isStopTrackingOnBreak && isBreak,
            ),
            mapTo(new UnsetCurrentTask()),
          ),
    ),
  );

  @Effect({ dispatch: false })
  playSessionDoneSoundIfEnabled$: Observable<unknown> = this._pomodoroService.isEnabled$.pipe(
    switchMap((isEnabledI) =>
      !isEnabledI
        ? EMPTY
        : this._actions$.pipe(
            ofType(
              PomodoroActionTypes.PausePomodoro,
              PomodoroActionTypes.FinishPomodoroSession,
              PomodoroActionTypes.SkipPomodoroBreak,
            ),
            withLatestFrom(this._pomodoroService.cfg$, this._pomodoroService.isBreak$),
            filter(
              ([action, cfg, isBreak]: [
                FinishPomodoroSession | PausePomodoro | SkipPomodoroBreak,
                PomodoroConfig,
                boolean,
              ]) => {
                return (
                  ((action.type === PomodoroActionTypes.FinishPomodoroSession ||
                    action.type === PomodoroActionTypes.SkipPomodoroBreak) &&
                    cfg.isPlaySound &&
                    isBreak) ||
                  (cfg.isPlaySoundAfterBreak && !cfg.isManualContinue && !isBreak) ||
                  (action.type === PomodoroActionTypes.PausePomodoro &&
                    (action as PausePomodoro).payload.isBreakEndPause)
                );
              },
            ),
            tap(() => this._pomodoroService.playSessionDoneSound()),
          ),
    ),
  );

  @Effect()
  pauseTimeTrackingForPause$: Observable<unknown> = this._pomodoroService.isEnabled$.pipe(
    switchMap((isEnabledI) =>
      !isEnabledI
        ? EMPTY
        : this._actions$.pipe(
            ofType(PomodoroActionTypes.PausePomodoro),
            withLatestFrom(this.currentTaskId$),
            filter(([act, currentTaskId]) => !!currentTaskId),
            mapTo(new UnsetCurrentTask()),
          ),
    ),
  );

  @Effect({ dispatch: false })
  openBreakDialog: Observable<unknown> = this._pomodoroService.isEnabled$.pipe(
    switchMap((isEnabledI) =>
      !isEnabledI
        ? EMPTY
        : this._actions$.pipe(
            ofType(PomodoroActionTypes.FinishPomodoroSession),
            withLatestFrom(this._pomodoroService.isBreak$),
            tap(([action, isBreak]: [FinishPomodoroSession, boolean]) => {
              if (isBreak) {
                this._matDialog.open(DialogPomodoroBreakComponent);
              }
            }),
          ),
    ),
  );

  @Effect({ dispatch: false })
  sessionStartSnack$: Observable<unknown> = this._pomodoroService.isEnabled$.pipe(
    switchMap((isEnabledI) =>
      !isEnabledI
        ? EMPTY
        : this._actions$.pipe(
            ofType(
              PomodoroActionTypes.FinishPomodoroSession,
              PomodoroActionTypes.SkipPomodoroBreak,
            ),
            withLatestFrom(
              this._pomodoroService.isBreak$,
              this._pomodoroService.isManualPause$,
              this._pomodoroService.currentCycle$,
            ),
            tap(
              ([action, isBreak, isPause, currentCycle]: [
                FinishPomodoroSession,
                boolean,
                boolean,
                number,
              ]) =>
                // TODO only notify if window is not currently focused
                this._notifyService.notifyDesktop({
                  title: isBreak
                    ? T.F.POMODORO.NOTIFICATION.BREAK_X_START
                    : T.F.POMODORO.NOTIFICATION.SESSION_X_START,
                  translateParams: { nr: `${currentCycle + 1}` },
                }),
            ),
            filter(
              ([action, isBreak, isPause, currentCycle]: [
                FinishPomodoroSession,
                boolean,
                boolean,
                number,
              ]) => !isBreak && !isPause,
            ),
            tap(
              ([action, isBreak, isPause, currentCycle]: [
                FinishPomodoroSession,
                boolean,
                boolean,
                number,
              ]) => {
                this._snackService.open({
                  ico: 'timer',
                  msg: T.F.POMODORO.NOTIFICATION.SESSION_X_START,
                  translateParams: { nr: `${currentCycle + 1}` },
                });
              },
            ),
          ),
    ),
  );

  @Effect({ dispatch: false })
  setTaskBarIconProgress$: Observable<unknown> = IS_ELECTRON
    ? this._pomodoroService.isEnabled$.pipe(
        switchMap((isEnabledI) =>
          !isEnabledI ? EMPTY : this._pomodoroService.sessionProgress$,
        ),
        withLatestFrom(this._pomodoroService.isManualPause$),
        // we display pomodoro progress for pomodoro
        tap(([progress, isPause]: [number, boolean]) => {
          const progressBarMode: 'normal' | 'pause' = isPause ? 'pause' : 'normal';
          (this._electronService.ipcRenderer as typeof ipcRenderer).send(
            IPC.SET_PROGRESS_BAR,
            {
              progress,
              progressBarMode,
            },
          );
        }),
      )
    : EMPTY;

  constructor(
    private _pomodoroService: PomodoroService,
    private _actions$: Actions,
    private _notifyService: NotifyService,
    private _matDialog: MatDialog,
    private _electronService: ElectronService,
    private _snackService: SnackService,
    private _store$: Store<any>,
  ) {}
}
