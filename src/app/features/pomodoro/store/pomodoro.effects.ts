import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { EMPTY, Observable, of } from 'rxjs';
import {
  concatMap,
  filter,
  map,
  mapTo,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';

import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, select, Store } from '@ngrx/store';

import { IS_ELECTRON } from '../../../app.constants';
import { NotifyService } from '../../../core/notify/notify.service';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from '../../../t.const';
import {
  setCurrentTask,
  toggleStart,
  unsetCurrentTask,
} from '../../tasks/store/task.actions';
import { selectCurrentTaskId } from '../../tasks/store/task.selectors';
import { TaskService } from '../../tasks/task.service';
import { DialogPomodoroBreakComponent } from '../dialog-pomodoro-break/dialog-pomodoro-break.component';
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

@Injectable()
export class PomodoroEffects {
  private _pomodoroService = inject(PomodoroService);
  private _actions$ = inject(Actions);
  private _notifyService = inject(NotifyService);
  private _matDialog = inject(MatDialog);
  private _snackService = inject(SnackService);
  private _store$ = inject<Store<any>>(Store);
  private _taskService = inject(TaskService);

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
              withLatestFrom(
                this._pomodoroService.isBreak$,
                this.currentTaskId$,
                this._pomodoroService.cfg$,
              ),
              filter(
                ([action, isBreak, currentTaskId, cfg]) =>
                  !isBreak && !currentTaskId && !cfg.isDisableAutoStartAfterBreak,
              ),
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

  pauseTimeTrackingAfterBreakIsOptionEnabled$: Observable<unknown> = createEffect(() =>
    this._pomodoroService.isEnabled$.pipe(
      switchMap((isEnabledI) =>
        !isEnabledI
          ? EMPTY
          : this._actions$.pipe(
              ofType(finishPomodoroSession, skipPomodoroBreak),
              withLatestFrom(this._pomodoroService.cfg$, this._pomodoroService.isBreak$),
              filter(
                ([action, cfg, isBreak]) =>
                  !!cfg.isDisableAutoStartAfterBreak && !isBreak,
              ),
              mapTo(unsetCurrentTask()),
            ),
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
              filter(([action, cfg, isBreak]) => !!cfg.isStopTrackingOnBreak && isBreak),
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
}
