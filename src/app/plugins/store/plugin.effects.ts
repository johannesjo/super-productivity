import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { PfapiService } from '../../pfapi/pfapi.service';
import {
  upsertPluginUserData,
  deletePluginUserData,
  upsertPluginMetadata,
  deletePluginMetadata,
} from './plugin.actions';
import { selectPluginUserDataFeatureState } from './plugin-user-data.reducer';
import { selectPluginMetadataFeatureState } from './plugin-metadata.reducer';

@Injectable()
export class PluginEffects {
  private _actions$ = inject(Actions);
  private _store = inject(Store);
  private _pfapiService = inject(PfapiService);

  persistPluginUserData$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(upsertPluginUserData, deletePluginUserData),
        withLatestFrom(this._store.select(selectPluginUserDataFeatureState)),
        tap(([_, state]) => {
          this._pfapiService.m.pluginUserData.save(state, {
            isUpdateRevAndLastUpdate: true,
          });
        }),
      ),
    { dispatch: false },
  );

  persistPluginMetadata$ = createEffect(
    () =>
      this._actions$.pipe(
        ofType(upsertPluginMetadata, deletePluginMetadata),
        withLatestFrom(this._store.select(selectPluginMetadataFeatureState)),
        tap(([_, state]) => {
          this._pfapiService.m.pluginMetadata.save(state, {
            isUpdateRevAndLastUpdate: true,
          });
        }),
      ),
    { dispatch: false },
  );
}
