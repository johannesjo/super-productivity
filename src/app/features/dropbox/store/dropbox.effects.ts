import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {loadDataComplete} from '../../../root-store/meta/load-data-complete.action';
import {GlobalConfigActionTypes, UpdateGlobalConfigSection} from '../../config/store/global-config.actions';
import {distinctUntilChanged, filter, map, pairwise, shareReplay, switchMap, tap, withLatestFrom} from 'rxjs/operators';
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
    // TODO filter UpdateGlobalConfigSection for updating dropbox
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
