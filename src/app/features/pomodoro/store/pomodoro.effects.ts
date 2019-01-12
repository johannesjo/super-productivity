import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { SetCurrentTask, TaskActionTypes } from '../../tasks/store/task.actions';
import { filter, map, tap, withLatestFrom } from 'rxjs/operators';
import { PomodoroService } from '../pomodoro.service';
import { PomodoroConfig } from '../../config/config.model';
import { FinishPomodoroSession, PausePomodoro, PomodoroActionTypes, StartPomodoro } from './pomodoro.actions';
import { MatDialog } from '@angular/material';
import { DialogPomodoroBreakComponent } from '../dialog-pomodoro-break/dialog-pomodoro-break.component';

@Injectable()
export class PomodoroEffects {

  @Effect()
  startOnCurrentUpdate$ = this._actions$.pipe(
    ofType(TaskActionTypes.SetCurrentTask),
    withLatestFrom(
      this._pomodoroService.cfg$,
    ),
    filter(([action, cfg]: [SetCurrentTask, PomodoroConfig]) =>
      cfg && cfg.isEnabled),
    map(([action]) => {
      if (action.payload) {
        return new StartPomodoro();
      } else {
        return new PausePomodoro();
      }
    }),
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
  ) {
  }

  private _sendUpdateToRemoteInterface() {
  }
}
