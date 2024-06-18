import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { DropboxApiService } from '../dropbox-api.service';
import { DataInitService } from '../../../../core/data-init/data-init.service';
import { SnackService } from '../../../../core/snack/snack.service';
import { EMPTY, from, Observable, of } from 'rxjs';
import {
  filter,
  map,
  mergeMap,
  switchMap,
  throttleTime,
  withLatestFrom,
} from 'rxjs/operators';
import { SyncConfig } from '../../../../features/config/global-config.model';
import { SyncProvider } from '../../sync-provider.model';
import { triggerDropboxAuthDialog } from './dropbox.actions';
import { GlobalConfigService } from '../../../../features/config/global-config.service';
import { updateGlobalConfigSection } from '../../../../features/config/store/global-config.actions';

@Injectable()
export class DropboxEffects {
  updateTokensFromDialog$: Observable<unknown> = createEffect(() =>
    this._actions$.pipe(
      ofType(triggerDropboxAuthDialog.type),
      throttleTime(1000),
      withLatestFrom(this._globalConfigService.sync$),
      switchMap(([, sync]) => {
        return from(this._dropboxApiService.getAccessTokenViaDialog()).pipe(
          mergeMap((res) =>
            res
              ? of(
                  updateGlobalConfigSection({
                    sectionKey: 'sync',
                    sectionCfg: {
                      ...sync,
                      dropboxSync: {
                        ...sync.dropboxSync,
                        accessToken: res.accessToken,
                        refreshToken: res.refreshToken,
                        _tokenExpiresAt: res.expiresAt,
                      },
                    } as SyncConfig,
                  }),
                )
              : EMPTY,
          ),
        );
      }),
    ),
  );

  triggerTokenDialog$: Observable<unknown> = createEffect(() =>
    this._actions$.pipe(
      ofType(updateGlobalConfigSection),
      filter(
        ({ sectionKey, sectionCfg }): boolean =>
          sectionKey === 'sync' &&
          (sectionCfg as SyncConfig).syncProvider === SyncProvider.Dropbox,
      ),
      withLatestFrom(this._dropboxApiService.isTokenAvailable$),
      filter(([, isTokenAvailable]) => !isTokenAvailable),
      map(() => triggerDropboxAuthDialog()),
    ),
  );

  constructor(
    private _actions$: Actions,
    private _dropboxApiService: DropboxApiService,
    private _globalConfigService: GlobalConfigService,
    private _snackService: SnackService,
    private _dataInitService: DataInitService,
  ) {}
}
