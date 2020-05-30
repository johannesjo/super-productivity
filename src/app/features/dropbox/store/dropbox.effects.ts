import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {loadDataComplete} from '../../../root-store/meta/load-data-complete.action';
import {GlobalConfigActionTypes} from '../../config/store/global-config.actions';
import {filter, switchMap, tap} from 'rxjs/operators';
import {DropboxApiService} from '../dropbox-api.service';
import {DropboxSyncService} from '../dropbox-sync.service';
import {GlobalConfigService} from '../../config/global-config.service';
import {DataInitService} from '../../../core/data-init/data-init.service';
import {GlobalSyncService} from '../../../core/global-sync/global-sync.service';
import {combineLatest} from 'rxjs';
import {DROPBOX_MIN_SYNC_INTERVAL} from '../dropbox.const';


@Injectable()
export class DropboxEffects {
  @Effect({dispatch: false}) triggerSync$: any = this._actions$.pipe(
    ofType(
      loadDataComplete.type,
      GlobalConfigActionTypes.LoadGlobalConfig,
      GlobalConfigActionTypes.UpdateGlobalConfigSection,
    ),
    switchMap(() => this._dataInitService.isAllDataLoadedInitially$),
    switchMap(() => combineLatest([
      this._dropboxApiService.isLoggedIn$,
      this._dropboxSyncService.isEnabled$,
      this._dropboxSyncService.syncInterval$,
    ]).pipe(
      filter(([isLoggedIn, isEnabled]) =>
        isLoggedIn && isEnabled),
      switchMap(([, , syncInterval]) =>
        this._globalSyncService.getSyncTrigger$(
          syncInterval >= DROPBOX_MIN_SYNC_INTERVAL
            ? syncInterval
            : DROPBOX_MIN_SYNC_INTERVAL
        ).pipe(
          tap(() => this._dropboxSyncService.sync())
        )
      ),
    )),
  );

  constructor(
    private _actions$: Actions,
    private _dropboxApiService: DropboxApiService,
    private _dropboxSyncService: DropboxSyncService,
    private _globalConfigService: GlobalConfigService,
    private _globalSyncService: GlobalSyncService,
    private _dataInitService: DataInitService,
  ) {
  }


}
