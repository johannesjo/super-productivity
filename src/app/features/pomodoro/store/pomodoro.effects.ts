import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { SetCurrentTask, TaskActionTypes, ToggleStart, UnsetCurrentTask } from '../../tasks/store/task.actions';
import { filter, flatMap, map, mapTo, tap, withLatestFrom } from 'rxjs/operators';
import { PomodoroService } from '../pomodoro.service';
import { PomodoroConfig } from '../../config/config.model';
import { FinishPomodoroSession, PausePomodoro, PomodoroActionTypes, StartPomodoro } from './pomodoro.actions';
import { MatDialog } from '@angular/material';
import { DialogPomodoroBreakComponent } from '../dialog-pomodoro-break/dialog-pomodoro-break.component';
import { select, Store } from '@ngrx/store';
import { selectCurrentTaskId } from '../../tasks/store/task.selectors';
import { EMPTY, Observable, of } from 'rxjs';
import { SnackOpen } from '../../../core/snack/store/snack.actions';
import { NotifyService } from '../../../core/notify/notify.service';

const isEnabled = ([action, cfg, ...v]) => cfg && cfg.isEnabled;

@Injectable()
export class PomodoroEffects {
  currentTaskId$: Observable<string> = this._store$.pipe(select(selectCurrentTaskId));

  @Effect()
  playPauseOnCurrentUpdate$ = this._actions$.pipe(
    ofType(
      TaskActionTypes.SetCurrentTask,
      TaskActionTypes.UnsetCurrentTask,
    ),
    withLatestFrom(
      this._pomodoroService.cfg$,
      this._pomodoroService.isBreak$,
    ),
    filter(isEnabled),
    flatMap(([action, cfg, isBreak]: [SetCurrentTask | UnsetCurrentTask, PomodoroConfig, boolean]): Observable<any> => {
      if (action['payload'] && action.type !== TaskActionTypes.UnsetCurrentTask) {
        return of(new StartPomodoro());
      } else if (isBreak && cfg.isStopTrackingOnBreak) {
        return EMPTY;
      } else {
        return of(new PausePomodoro());
      }
    }),
  );


  @Effect()
  autoStartNextOnSessionStartIfNotAlready$ = this._actions$.pipe(
    ofType(PomodoroActionTypes.FinishPomodoroSession),
    withLatestFrom(
      this._pomodoroService.cfg$,
      this._pomodoroService.isBreak$,
      this.currentTaskId$,
    ),
    filter(isEnabled),
    filter(([action, cfg, isBreak, currentTaskId]: [FinishPomodoroSession, PomodoroConfig, boolean, string]) =>
      (!isBreak && !currentTaskId && !action.payload.isDontResume)
    ),
    mapTo(new ToggleStart()),
  );

  @Effect()
  pauseTimeTrackingIfOptionEnabled$ = this._actions$.pipe(
    ofType(PomodoroActionTypes.FinishPomodoroSession),
    withLatestFrom(
      this._pomodoroService.cfg$,
      this._pomodoroService.isBreak$,
    ),
    filter(isEnabled),
    filter(([action, cfg, isBreak]: [FinishPomodoroSession, PomodoroConfig, boolean]) =>
      cfg.isStopTrackingOnBreak && isBreak),
    mapTo(new UnsetCurrentTask()),
  );

  @Effect({dispatch: false})
  playSessionDoneSoundIfEnabled$ = this._actions$.pipe(
    ofType(PomodoroActionTypes.FinishPomodoroSession),
    withLatestFrom(
      this._pomodoroService.cfg$,
      this._pomodoroService.isBreak$,
    ),
    filter(isEnabled),
    filter(([action, cfg, isBreak]: [FinishPomodoroSession, PomodoroConfig, boolean]) =>
      cfg.isPlaySound && isBreak),
    tap(() => this._pomodoroService.playSessionDoneSound()),
  );

  @Effect()
  pauseTimeTrackingForPause$ = this._actions$.pipe(
    ofType(PomodoroActionTypes.PausePomodoro),
    withLatestFrom(
      this._pomodoroService.cfg$,
      this.currentTaskId$,
    ),
    filter(isEnabled),
    filter(([act, cfg, currentTaskId]) => !!currentTaskId),
    mapTo(new UnsetCurrentTask()),
  );

  @Effect({dispatch: false})
  openBreakDialog = this._actions$.pipe(
    ofType(PomodoroActionTypes.FinishPomodoroSession),
    withLatestFrom(
      this._pomodoroService.isBreak$,
    ),
    tap(([action, isBreak]: [FinishPomodoroSession, boolean]) => {
      if (isBreak) {
        this._matDialog.open(DialogPomodoroBreakComponent);
      }
    }),
  );

  @Effect()
  sessionStartSnack$ = this._actions$.pipe(
    ofType(PomodoroActionTypes.FinishPomodoroSession),
    withLatestFrom(
      this._pomodoroService.isBreak$,
      this._pomodoroService.isManualPause$,
      this._pomodoroService.currentCycle$,
    ),
    tap(([action, isBreak, isPause, currentCycle]: [FinishPomodoroSession, boolean, boolean, number]) =>
      // TODO only notify if window is not currently focused
      this._notifyService.notify({
        title: isBreak
          ? `Pomodoro: Break ${currentCycle + 1} started!`
          : `Pomodoro: Session ${currentCycle + 1} started!`
      })),
    filter(([action, isBreak, isPause, currentCycle]: [FinishPomodoroSession, boolean, boolean, number]) =>
      !isBreak && !isPause
    ),
    map(([action, isBreak, isPause, currentCycle]: [FinishPomodoroSession, boolean, boolean, number]) => {
      const cycle = currentCycle + 1;
      return new SnackOpen({
        icon: 'timer',
        message: `Pomodoro: Session ${cycle} started!`,
      });
    }),
  );


  constructor(
    private _pomodoroService: PomodoroService,
    private _actions$: Actions,
    private _notifyService: NotifyService,
    private _matDialog: MatDialog,
    private _store$: Store<any>,
  ) {
  }

  private _sendUpdateToRemoteInterface() {
  }
}
