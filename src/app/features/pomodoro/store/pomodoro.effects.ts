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
import { Observable } from 'rxjs';

const isEnabled = ([action, cfg, ...v]) => cfg && cfg.isEnabled;

@Injectable()
export class PomodoroEffects {
  currentTaskId$: Observable<string> = this._store$.pipe(select(selectCurrentTaskId));

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
      this.currentTaskId$,
    ),
    filter(isEnabled),
    filter(([action, cfg, isBreak, currentTaskId]: [FinishPomodoroSession, PomodoroConfig, boolean, string]) =>
      (!isBreak && !currentTaskId && !action.payload.isDontResume)
    ),
    mapTo(new ToggleStart()),
  );

  @Effect()
  pauseTimeTrackingForOption$ = this._actions$.pipe(
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

  @Effect()
  pauseTimeTrackingForPause$ = this._actions$.pipe(
    ofType(PomodoroActionTypes.PausePomodoro),
    withLatestFrom(
      this._pomodoroService.cfg$,
      this.currentTaskId$,
    ),
    filter(isEnabled),
    filter(([act, cfg, currentTaskId]) => !!currentTaskId),
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
