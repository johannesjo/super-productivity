import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { PomodoroActionTypes } from './pomodoro.actions';

@Injectable()
export class PomodoroEffects {

  // @Effect()
  // loadPomodoros$ = this.actions$.pipe(ofType(PomodoroActionTypes.LoadPomodoros));

  constructor(private actions$: Actions) {}
}
