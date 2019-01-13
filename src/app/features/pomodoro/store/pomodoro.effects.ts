import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { SetCurrentTask, TaskActionTypes, ToggleStart } from '../../tasks/store/task.actions';
import { filter, map, mapTo, tap, withLatestFrom } from 'rxjs/operators';
import { PomodoroService } from '../pomodoro.service';
import { PomodoroConfig } from '../../config/config.model';
import { FinishPomodoroSession, PausePomodoro, PomodoroActionTypes, StartPomodoro } from './pomodoro.actions';
import { MatDialog } from '@angular/material';
import { DialogPomodoroBreakComponent } from '../dialog-pomodoro-break/dialog-pomodoro-break.component';
import { select, Store } from '@ngrx/store';
import { selectCurrentTaskId } from '../../tasks/store/task.selectors';

const isEnabled = ([action, cfg, ...v]) => cfg && cfg.isEnabled;

@Injectable()
export class PomodoroEffects {

  @Effect()
  startOnCurrentUpdate$ = this._actions$.pipe(
    ofType(TaskActionTypes.SetCurrentTask),
    withLatestFrom(
      this._pomodoroService.cfg$,
      this._pomodoroService.isBreak$,
    ),
    filter(isEnabled),
    filter(([action, cfg, isBreak]: [SetCurrentTask, PomodoroConfig, boolean]) =>
      cfg && cfg.isEnabled
      && !(!action.payload && cfg.isStopTrackingOnBreak && isBreak)
    ),
    map(([action]) => {
      if (action.payload) {
        return new StartPomodoro();
      } else {
        return new PausePomodoro();
      }
    }),
  );


  @Effect()
  autoStartNextOnSessionStartIfNotAlready$ = this._actions$.pipe(
    ofType(PomodoroActionTypes.FinishPomodoroSession),
    withLatestFrom(
      this._pomodoroService.cfg$,
      this._pomodoroService.isBreak$,
      this._store$.pipe(select(selectCurrentTaskId)),
    ),
    filter(isEnabled),
    filter(([action, cfg, isBreak, currentTaskId]: [FinishPomodoroSession, PomodoroConfig, boolean, string]) =>
      (!isBreak && !currentTaskId)
    ),
    mapTo(new ToggleStart()),
  );

  @Effect()
  pauseTimeTracking$ = this._actions$.pipe(
    ofType(PomodoroActionTypes.FinishPomodoroSession),
    withLatestFrom(
      this._pomodoroService.cfg$,
      this._pomodoroService.isBreak$,
    ),
    filter(isEnabled),
    filter(([action, cfg, isBreak]: [FinishPomodoroSession, PomodoroConfig, boolean]) =>
      cfg && cfg.isStopTrackingOnBreak && isBreak),
    mapTo(new SetCurrentTask(null)),
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

  constructor(
    private _pomodoroService: PomodoroService,
    private _actions$: Actions,
    private _matDialog: MatDialog,
    private _store$: Store<any>,
  ) {
  }

  private _sendUpdateToRemoteInterface() {
  }
}
