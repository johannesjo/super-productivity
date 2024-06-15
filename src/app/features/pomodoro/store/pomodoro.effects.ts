import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  setCurrentTask,
  toggleStart,
  unsetCurrentTask,
} from '../../tasks/store/task.actions';
import {
  concatMap,
  filter,
  map,
  mapTo,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { PomodoroService } from '../pomodoro.service';
import {
  finishPomodoroSession,
  pausePomodoro,
  pausePomodoroBreak,
  skipPomodoroBreak,
  startPomodoro,
  startPomodoroBreak,
  stopPomodoro,
} from './pomodoro.actions';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogPomodoroBreakComponent } from '../dialog-pomodoro-break/dialog-pomodoro-break.component';
import { Action, select, Store } from '@ngrx/store';
import { selectCurrentTaskId } from '../../tasks/store/task.selectors';
import { EMPTY, Observable, of } from 'rxjs';
import { NotifyService } from '../../../core/notify/notify.service';
import { IS_ELECTRON } from '../../../app.constants';
import { T } from '../../../t.const';
import { SnackService } from '../../../core/snack/snack.service';
import { TaskService } from '../../tasks/task.service';

@Injectable()
export class PomodoroEffects {
  currentTaskId$: Observable<string | null> = this._store$.pipe(
    select(selectCurrentTaskId),
  );

  hasActiveTasks$ = this._taskService.allStartableTasks$.pipe(
    map((tasks) => tasks.length > 0),
  );

  playPauseOnCurrentUpdate$: Observable<Action> = createEffect(() =>
    this._pomodoroService.isEnabled$.pipe(
      switchMap((isEnabledI) => of(isEnabledI)),
      filter((isEnabled) => !!isEnabled),
      switchMap((isEnabledI) =>
        this._actions$.pipe(
          ofType(setCurrentTask, unsetCurrentTask),
          withLatestFrom(
            this._pomodoroService.cfg$,
            this._pomodoroService.isBreak$,
            this._pomodoroService.currentSessionTime$,
            this.hasActiveTasks$,
          ),
          // don't update when on break and stop time tracking is active
          filter(
            ([action, cfg, isBreak, currentSessionTime, hasActiveTasks]) =>
              !isBreak ||
              !cfg.isStopTrackingOnBreak ||
              (isBreak && currentSessionTime <= 0 && action.type === setCurrentTask.type),
          ),
          concatMap(([action, , isBreak, currentSessionTime, hasActiveTasks]) => {
            if (!hasActiveTasks) {
              // We cannot start Pomodoro Timer
              this._snackService.open(T.F.POMODORO.NOTIFICATION.NO_TASKS);
              return of(pausePomodoro({ isBreakEndPause: false }));
            }
            if ((action as any)?.id && action.type !== unsetCurrentTask.type) {
              if (isBreak && currentSessionTime <= 0) {
                return of(finishPomodoroSession(), startPomodoro());
              }
              return of(startPomodoro());
            } else {
              return of(pausePomodoro({ isBreakEndPause: false }));
            }
          }),
        ),
      ),
    ),
  );

  autoStartNextOnSessionStartIfNotAlready$: Observable<unknown> = createEffect(() =>
    this._pomodoroService.isEnabled$.pipe(
      switchMap((isEnabledI) =>
        !isEnabledI
          ? EMPTY
          : this._actions$.pipe(
              ofType(finishPomodoroSession, skipPomodoroBreak),
              withLatestFrom(this._pomodoroService.isBreak$, this.currentTaskId$),
              filter(([action, isBreak, currentTaskId]) => !isBreak && !currentTaskId),
              mapTo(toggleStart()),
            ),
      ),
    ),
  );

  stopPomodoro$: Observable<unknown> = createEffect(() =>
    this._pomodoroService.isEnabled$.pipe(
      switchMap((isEnabledI) =>
        !isEnabledI
          ? EMPTY
          : this._actions$.pipe(ofType(stopPomodoro), mapTo(unsetCurrentTask())),
      ),
    ),
  );

  pauseTimeTrackingIfOptionEnabled$: Observable<unknown> = createEffect(() =>
    this._pomodoroService.isEnabled$.pipe(
      switchMap((isEnabledI) =>
        !isEnabledI
          ? EMPTY
          : this._actions$.pipe(
              ofType(finishPomodoroSession),
              withLatestFrom(this._pomodoroService.cfg$, this._pomodoroService.isBreak$),
              filter(([action, cfg, isBreak]) => cfg.isStopTrackingOnBreak && isBreak),
              mapTo(unsetCurrentTask()),
            ),
      ),
    ),
  );

  playSessionDoneSoundIfEnabled$: Observable<unknown> = createEffect(
    () =>
      this._pomodoroService.isEnabled$.pipe(
        switchMap((isEnabledI) =>
          !isEnabledI
            ? EMPTY
            : this._actions$.pipe(
                ofType(
                  pausePomodoro,
                  pausePomodoroBreak,
                  finishPomodoroSession,
                  skipPomodoroBreak,
                ),
                withLatestFrom(
                  this._pomodoroService.cfg$,
                  this._pomodoroService.isBreak$,
                ),
                filter(([a, cfg, isBreak]) => {
                  return (
                    ((a.type === finishPomodoroSession.type ||
                      a.type === skipPomodoroBreak.type) &&
                      cfg.isPlaySound &&
                      isBreak) ||
                    (cfg.isPlaySoundAfterBreak && !cfg.isManualContinue && !isBreak) ||
                    (a.type === pausePomodoro.type && a.isBreakEndPause) ||
                    (a.type === pausePomodoroBreak.type && a.isBreakStartPause)
                  );
                }),
                tap(() => this._pomodoroService.playSessionDoneSound()),
              ),
        ),
      ),
    { dispatch: false },
  );

  pauseTimeTrackingForBreak$: Observable<unknown> = createEffect(() =>
    this._pomodoroService.isEnabled$.pipe(
      switchMap((isEnabledI) =>
        !isEnabledI
          ? EMPTY
          : this._actions$.pipe(
              ofType(startPomodoroBreak),
              withLatestFrom(this.currentTaskId$),
              filter(([, currentTaskId]) => !!currentTaskId),
              mapTo(unsetCurrentTask()),
            ),
      ),
    ),
  );

  openBreakDialog: Observable<unknown> = createEffect(
    () =>
      this._pomodoroService.isEnabled$.pipe(
        switchMap((isEnabledI) =>
          !isEnabledI
            ? EMPTY
            : this._actions$.pipe(
                ofType(finishPomodoroSession, pausePomodoroBreak),
                withLatestFrom(this._pomodoroService.isBreak$),
                tap(([action, isBreak]) => {
                  if (isBreak) {
                    this._matDialog.open(DialogPomodoroBreakComponent);
                  }
                }),
              ),
        ),
      ),
    { dispatch: false },
  );

  sessionStartSnack$: Observable<unknown> = createEffect(
    () =>
      this._pomodoroService.isEnabled$.pipe(
        switchMap((isEnabledI) =>
          !isEnabledI
            ? EMPTY
            : this._actions$.pipe(
                ofType(
                  pausePomodoroBreak,
                  startPomodoroBreak,
                  finishPomodoroSession,
                  skipPomodoroBreak,
                ),
                withLatestFrom(
                  this._pomodoroService.isBreak$,
                  this._pomodoroService.isManualPauseWork$,
                  this._pomodoroService.isManualPauseBreak$,
                  this._pomodoroService.currentCycle$,
                ),
                tap(([action, isBreak, isPause, isPauseBreak, currentCycle]) =>
                  // TODO only notify if window is not currently focused
                  this._notifyService.notifyDesktop({
                    title: isBreak
                      ? isPauseBreak
                        ? T.F.POMODORO.NOTIFICATION.BREAK_TIME
                        : T.F.POMODORO.NOTIFICATION.BREAK_X_START
                      : T.F.POMODORO.NOTIFICATION.SESSION_X_START,
                    translateParams: { nr: `${currentCycle + 1}` },
                  }),
                ),
                filter(
                  ([action, isBreak, isPause, isPauseBreak, currentCycle]) =>
                    !isBreak && !isPause && !isPauseBreak,
                ),
                tap(([action, isBreak, isPause, isPauseBreak, currentCycle]) => {
                  this._snackService.open({
                    ico: 'timer',
                    msg: T.F.POMODORO.NOTIFICATION.SESSION_X_START,
                    translateParams: { nr: `${currentCycle + 1}` },
                  });
                }),
              ),
        ),
      ),
    { dispatch: false },
  );

  setTaskBarIconProgress$: any =
    IS_ELECTRON &&
    createEffect(
      () =>
        this._pomodoroService.isEnabled$.pipe(
          switchMap((isEnabledI) =>
            !isEnabledI ? EMPTY : this._pomodoroService.sessionProgress$,
          ),
          withLatestFrom(
            this._pomodoroService.isManualPauseWork$,
            this._pomodoroService.isManualPauseBreak$,
          ),
          // we display pomodoro progress for pomodoro
          tap(([progress, isPause, isPauseBreak]: [number, boolean, boolean]) => {
            const progressBarMode: 'normal' | 'pause' =
              isPause || isPauseBreak ? 'pause' : 'normal';
            window.ea.setProgressBar({
              progress,
              progressBarMode,
            });
          }),
        ),
      { dispatch: false },
    );

  constructor(
    private _pomodoroService: PomodoroService,
    private _actions$: Actions,
    private _notifyService: NotifyService,
    private _matDialog: MatDialog,
    private _snackService: SnackService,
    private _store$: Store<any>,
    private _taskService: TaskService,
  ) {}
}
