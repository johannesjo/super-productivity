import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { tap, withLatestFrom } from 'rxjs/operators';
import { ConfigActionTypes } from './config.actions';
import { Store } from '@ngrx/store';
import { CONFIG_FEATURE_NAME } from './config.reducer';
import { PersistenceService } from '../../persistence/persistence.service';

@Injectable()
export class ConfigEffects {
  @Effect({dispatch: false}) updateTask$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.UpdateConfigSection,
        ConfigActionTypes.UpdateConfig,
      ),
      withLatestFrom(this._store),
      tap(this._saveToLs.bind(this))
    );

  constructor(
    private _actions$: Actions,
    private _persistenceService: PersistenceService,
    private _store: Store<any>
  ) {
  }

  private _saveToLs(state) {
    const globalConfig = state[1][CONFIG_FEATURE_NAME];
    this._persistenceService.saveGlobalConfig(globalConfig);
  }
}
