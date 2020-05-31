import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {GlobalConfigActionTypes, UpdateGlobalConfigSection} from '../../config/store/global-config.actions';
import {
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  pairwise,
  shareReplay,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import {DropboxApiService} from '../dropbox-api.service';
import {DropboxSyncService} from '../dropbox-sync.service';
import {GlobalConfigService} from '../../config/global-config.service';
import {DataInitService} from '../../../core/data-init/data-init.service';
import {SyncService} from '../../../imex/sync/sync.service';
import {DROPBOX_MIN_SYNC_INTERVAL} from '../dropbox.const';
import {SyncProvider} from '../../../imex/sync/sync-provider';
import {SYNC_INITIAL_SYNC_TRIGGER} from '../../../imex/sync/sync.const';
import {combineLatest, EMPTY} from 'rxjs';
import {isOnline$} from '../../../util/is-online';
import {SnackService} from '../../../core/snack/snack.service';
import {dbxLog} from '../dropbox-log.util';


@Injectable()
export class DropboxEffects {
  @Effect({dispatch: false}) triggerSync$: any = this._dataInitService.isAllDataLoadedInitially$.pipe(
    switchMap(() => combineLatest([
      this._dropboxSyncService.isEnabledAndReady$,
      this._dropboxSyncService.syncInterval$,
    ])),
    switchMap(([isEnabledAndReady, syncInterval]) => isEnabledAndReady
      ? this._syncService.getSyncTrigger$(
        (syncInterval >= DROPBOX_MIN_SYNC_INTERVAL)
          ? syncInterval
          : DROPBOX_MIN_SYNC_INTERVAL
      )
      : EMPTY
    ),
    tap((x) => dbxLog('sync(effect).....', x)),
    withLatestFrom(isOnline$),
    // don't run multiple after each other when dialog is open
    exhaustMap(([trigger, isOnline]) => {
      if (!isOnline) {
        this._snackService.open({msg: 'Unable to sync, because offline', type: 'ERROR'});
        if (trigger === SYNC_INITIAL_SYNC_TRIGGER) {
          this._syncService.setInitialSyncDone(true, SyncProvider.Dropbox);
        }
        return;
      }
      return this._dropboxSyncService.sync().then(() => {
        if (trigger === SYNC_INITIAL_SYNC_TRIGGER) {
          this._syncService.setInitialSyncDone(true, SyncProvider.Dropbox);
        }
      });
    }),
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
    tap(() => this._snackService.open({type: 'SUCCESS', msg: 'Access Token successfully generated'})),
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
    private _syncService: SyncService,
    private _snackService: SnackService,
    private _dataInitService: DataInitService,
  ) {
  }


}
