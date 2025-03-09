import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { DropboxApiService } from '../dropbox-api.service';
import { from, Observable } from 'rxjs';
import {
  filter,
  map,
  switchMap,
  tap,
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
  private _actions$ = inject(Actions);
  private _dropboxApiService = inject(DropboxApiService);
  private _globalConfigService = inject(GlobalConfigService);

  updateTokensFromDialog$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(triggerDropboxAuthDialog.type),
        throttleTime(1000),
        withLatestFrom(this._globalConfigService.sync$),
        switchMap(([, sync]) => {
          return from(this._dropboxApiService.getAccessTokenViaDialog()).pipe(
            tap((res) => {
              if (res) {
                this._dropboxApiService.updateTokens({
                  accessToken: res.accessToken,
                  refreshToken: res.refreshToken,
                  expiresAt: res.expiresAt,
                });
              }
            }),
          );
        }),
      ),
    { dispatch: false },
  );

  triggerTokenDialog$: Observable<unknown> = createEffect(() =>
    this._actions$.pipe(
      ofType(updateGlobalConfigSection),
      filter(
        ({ sectionKey, sectionCfg }): boolean =>
          sectionKey === 'sync' &&
          (sectionCfg as SyncConfig).syncProvider === SyncProvider.Dropbox &&
          (sectionCfg as SyncConfig).isEnabled !== false,
      ),
      withLatestFrom(this._dropboxApiService.isTokenAvailable$),
      filter(([, isTokenAvailable]) => !isTokenAvailable),
      map(() => triggerDropboxAuthDialog()),
    ),
  );

  askToDeleteTokensOnDisable$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateGlobalConfigSection),
        filter(
          ({ sectionKey, sectionCfg }): boolean =>
            sectionKey === 'sync' &&
            (sectionCfg as SyncConfig).syncProvider === SyncProvider.Dropbox &&
            (sectionCfg as SyncConfig).isEnabled === false,
        ),
        withLatestFrom(this._dropboxApiService.isTokenAvailable$),
        filter(([, isTokenAvailable]) => isTokenAvailable),
        tap(
          () =>
            confirm('You disabled sync. Do you want to delete your Dropbox tokens?') &&
            this._dropboxApiService.deleteTokens(),
        ),
      ),
    { dispatch: false },
  );
}
