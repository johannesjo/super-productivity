import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { SetCurrentTask, TaskActionTypes } from '../../tasks/store/task.actions';
import { filter, map, tap, withLatestFrom } from 'rxjs/operators';
import { PomodoroService } from '../pomodoro.service';
import { PomodoroConfig } from '../../config/config.model';
import { PausePomodoro, PomodoroActionTypes, StartPomodoro } from './pomodoro.actions';

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

  constructor(
    private _pomodoroService: PomodoroService,
    private _actions$: Actions,
  ) {
  }
}
