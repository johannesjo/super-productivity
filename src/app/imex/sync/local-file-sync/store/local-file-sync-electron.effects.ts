import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { updateGlobalConfigSection } from '../../../../features/config/store/global-config.actions';
import { filter, tap } from 'rxjs/operators';
import { SyncConfig } from '../../../../features/config/global-config.model';
import { SyncProvider } from '../../sync-provider.model';
import { LocalFileSyncElectronService } from '../local-file-sync-electron.service';
import { IS_ELECTRON } from '../../../../app.constants';

@Injectable()
export class LocalFileSyncElectronEffects {
  private _actions$ = inject(Actions);
  private _localFileSyncElectronService = inject(LocalFileSyncElectronService);

  triggerTokenDialog$: Observable<unknown> | false =
    IS_ELECTRON &&
    createEffect(
      () =>
        this._actions$.pipe(
          ofType(updateGlobalConfigSection),
          filter(
            ({ sectionKey, sectionCfg }): boolean =>
              sectionKey === 'sync' &&
              (sectionCfg as SyncConfig).syncProvider === SyncProvider.LocalFile &&
              (sectionCfg as SyncConfig).isEnabled,
          ),
          tap(() =>
            this._localFileSyncElectronService.checkDirAndOpenPickerIfNotExists(),
          ),
        ),
      { dispatch: false },
    );
}
