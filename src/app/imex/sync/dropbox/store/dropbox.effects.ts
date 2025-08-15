import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { filter, tap, withLatestFrom } from 'rxjs/operators';
import { SyncConfig } from '../../../../features/config/global-config.model';
import { updateGlobalConfigSection } from '../../../../features/config/store/global-config.actions';
import { environment } from '../../../../../environments/environment';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { DropboxPrivateCfg, SyncProviderId } from '../../../../pfapi/api';

@Injectable()
export class DropboxEffects {
  private _actions$ = inject(Actions);
  private _pfapiService = inject(PfapiService);

  askToDeleteTokensOnDisable$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateGlobalConfigSection),
        filter(
          ({ sectionKey, sectionCfg }): boolean =>
            sectionKey === 'sync' && (sectionCfg as SyncConfig).isEnabled === false,
        ),
        withLatestFrom(this._pfapiService.currentProviderPrivateCfg$),
        tap(async ([, provider]) => {
          if (
            provider?.providerId === SyncProviderId.Dropbox &&
            (provider.privateCfg as DropboxPrivateCfg)?.accessToken
          ) {
            if (!environment.production && !confirm('DEV: Delete Dropbox Tokens?')) {
              return;
            }
            alert('Delete tokens');
            const existingConfig = provider.privateCfg as DropboxPrivateCfg;
            await this._pfapiService.pf.setPrivateCfgForSyncProvider(
              SyncProviderId.Dropbox,
              {
                ...existingConfig,
                accessToken: '',
                refreshToken: '',
              },
            );
          }
        }),
      ),
    { dispatch: false },
  );
}
