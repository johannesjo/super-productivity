import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {loadAllData} from '../../../root-store/meta/load-all-data.action';
import {GlobalConfigActionTypes, UpdateGlobalConfigSection} from '../../config/store/global-config.actions';
import {distinctUntilChanged, filter, map, pairwise, shareReplay, switchMap, tap, withLatestFrom} from 'rxjs/operators';
import {DropboxApiService} from '../dropbox-api.service';
import {DropboxSyncService} from '../dropbox-sync.service';
import {GlobalConfigService} from '../../config/global-config.service';
import {DataInitService} from '../../../core/data-init/data-init.service';
import {GlobalSyncService, INITIAL_SYNC_TRIGGER} from '../../../imex/global-sync/global-sync.service';
import {DROPBOX_MIN_SYNC_INTERVAL} from '../dropbox.const';
import {SyncProvider} from '../../../imex/global-sync/sync-provider';
import {isOnline$} from '../../../util/is-online';


@Injectable()
export class DropboxEffects {
  @Effect({dispatch: false}) triggerSync$: any = this._actions$.pipe(
    ofType(
      loadAllData.type,
      GlobalConfigActionTypes.UpdateGlobalConfigSection,
    ),
    filter((a: UpdateGlobalConfigSection) => !(a.type === GlobalConfigActionTypes.UpdateGlobalConfigSection)
      || a.payload.sectionKey === 'dropboxSync'),
    switchMap(() => this._dataInitService.isAllDataLoadedInitially$),
    switchMap((ev) => isOnline$.pipe(
      filter(isOnline => isOnline),
    )),
    switchMap(() => this._dropboxSyncService.isEnabledAndReady$),
    filter((isEnabledAndReady) => isEnabledAndReady),
    switchMap(() => this._dropboxSyncService.syncInterval$),
    switchMap((syncInterval) =>
      this._globalSyncService.getSyncTrigger$(
        syncInterval >= DROPBOX_MIN_SYNC_INTERVAL
          ? syncInterval
          : DROPBOX_MIN_SYNC_INTERVAL),
    ),
    tap((x) => console.log('sync.....', x)),
    switchMap((trigger: any) => this._dropboxSyncService.sync().then(() => {
      if (trigger === INITIAL_SYNC_TRIGGER) {
        this._globalSyncService.setInitialSyncDone(true, SyncProvider.Dropbox);
      }
    })),
  );

  private _isChangedAccessCode$ = this._dataInitService.isAllDataLoadedInitially$.pipe(
    switchMap(() => this._dropboxApiService.accessCode$),
    distinctUntilChanged(),
    pairwise(),
    map(([a, b]) => a !== b),
    shareReplay(),
  );

  @Effect() generateAccessCode$: any = this._actions$.pipe(
    ofType(
      GlobalConfigActionTypes.UpdateGlobalConfigSection,
    ),
    filter(({payload}: UpdateGlobalConfigSection) =>
      payload.sectionKey === 'dropboxSync'
      && (payload.sectionCfg as any).authCode),
    withLatestFrom(this._isChangedAccessCode$),
    filter(([, isChanged]: [UpdateGlobalConfigSection, boolean]) => isChanged),
    switchMap(([{payload}, isChanged]: [UpdateGlobalConfigSection, boolean]) =>
      this._dropboxApiService.getAccessTokenFromAuthCode((payload.sectionCfg as any).authCode)),
    map((_accessToken: string) => new UpdateGlobalConfigSection({
      sectionKey: 'dropboxSync',
      sectionCfg: {accessToken: _accessToken}
    })),
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
