import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { DropboxApiService } from '../dropbox-api.service';
import { DataInitService } from '../../../../core/data-init/data-init.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { from, Observable } from 'rxjs';
import { filter, map, switchMap, withLatestFrom } from 'rxjs/operators';
import {
  GlobalConfigActionTypes,
  UpdateGlobalConfigSection,
} from '../../../../features/config/store/global-config.actions';
import { SyncConfig } from '../../../../features/config/global-config.model';
import { SyncProvider } from '../../sync-provider.model';

@Injectable()
export class DropboxEffects {
  updateTokenDialog$: Observable<unknown> = createEffect(() =>
    this._actions$.pipe(
      ofType(GlobalConfigActionTypes.UpdateGlobalConfigSection),
      filter(
        ({ payload }: UpdateGlobalConfigSection): boolean =>
          payload.sectionKey === 'sync' &&
          (payload.sectionCfg as SyncConfig).syncProvider === SyncProvider.Dropbox,
      ),
      withLatestFrom(this._dropboxApiService.isTokenAvailable$),
      filter(([, isTokenAvailable]) => !isTokenAvailable),
      switchMap(([{ payload }]) => {
        const sync = payload.sectionCfg as SyncConfig;
        return from(this._dropboxApiService.getAccessTokenViaDialog()).pipe(
          map(
            (accessToken) =>
              new UpdateGlobalConfigSection({
                sectionKey: 'sync',
                sectionCfg: {
                  ...sync,
                  dropboxSync: {
                    ...sync.dropboxSync,
                    accessToken,
                  },
                } as SyncConfig,
              }),
          ),
        );
      }),
    ),
  );

  constructor(
    private _actions$: Actions,
    private _dropboxApiService: DropboxApiService,
    private _snackService: SnackService,
    private _dataInitService: DataInitService,
  ) {}
}
