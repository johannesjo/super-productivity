import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { ConfigActionTypes } from './config.actions';

@Injectable()
export class ConfigEffects {

  @Effect()
  loadFoos$ = this.actions$.pipe(ofType(ConfigActionTypes.LoadConfigs));

  constructor(private actions$: Actions) {}
}
