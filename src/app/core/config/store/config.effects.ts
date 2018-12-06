import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { tap, withLatestFrom } from 'rxjs/operators';
import { ConfigActionTypes, UpdateConfigSection } from './config.actions';
import { Store } from '@ngrx/store';
import { CONFIG_FEATURE_NAME } from './config.reducer';
import { PersistenceService } from '../../persistence/persistence.service';
import { SnackOpen } from '../../snack/store/snack.actions';

@Injectable()
export class ConfigEffects {
  @Effect({dispatch: false}) updateConfig$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.UpdateConfigSection,
        ConfigActionTypes.UpdateConfig,
      ),
      withLatestFrom(this._store),
      tap(this._saveToLs.bind(this))
    );

  @Effect({dispatch: false}) snackUpdate$: any = this._actions$
    .pipe(
      ofType(
        ConfigActionTypes.UpdateConfigSection,
      ),
      tap((action: UpdateConfigSection) => {
        const {sectionKey, sectionCfg} = action.payload;
        const isPublicSection = sectionKey.charAt(0) !== '_';
        const isPublicPropUpdated = Object.keys(sectionCfg).find((key) => key.charAt(0) !== '_');
        if (isPublicPropUpdated && isPublicSection) {
          this._store.dispatch(new SnackOpen({
            type: 'SUCCESS',
            message: `Updated settings for <strong>${sectionKey}</strong>`,
          }));
        }
      })
    );

  constructor(
    private _actions$: Actions,
    private _persistenceService: PersistenceService,
    private _store: Store<any>
  ) {
  }

  private async _saveToLs([action, state]) {
    console.log(action);
    const isSkipLastActiveUpdate = action.payload && action.payload.isSkipLastActiveUpdate;
    if (!isSkipLastActiveUpdate) {
      this._persistenceService.saveLastActive();
    }

    const globalConfig = state[CONFIG_FEATURE_NAME];
    await this._persistenceService.saveGlobalConfig(globalConfig);
  }
}
