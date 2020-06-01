import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {GlobalConfigActionTypes, UpdateGlobalConfigSection} from '../../config/store/global-config.actions';
import {
  catchError,
  exhaustMap,
  filter,
  map,
  mapTo,
  pairwise,
  shareReplay,
  switchMap,
  take,
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
import {combineLatest, EMPTY, from, merge} from 'rxjs';
import {isOnline$} from '../../../util/is-online';
import {SnackService} from '../../../core/snack/snack.service';
import {dbxLog} from '../dropbox-log.util';
import {T} from '../../../t.const';


@Injectable()
export class DropboxEffects {
  @Effect({dispatch: false}) triggerSync$: any = this._dataInitService.isAllDataLoadedInitially$.pipe(
    switchMap(() => merge(
      // dynamic
      combineLatest([
        this._dropboxSyncService.isEnabledAndReady$,
        this._dropboxSyncService.syncInterval$,
      ]).pipe(
        switchMap(([isEnabledAndReady, syncInterval]) => isEnabledAndReady
          ? this._syncService.getSyncTrigger$(syncInterval, DROPBOX_MIN_SYNC_INTERVAL)
          : EMPTY
        ),
      ),
      // initial
      this._dropboxSyncService.isEnabledAndReady$.pipe(
        take(1),
        filter(isEnabledAndReady => isEnabledAndReady),
        mapTo(SYNC_INITIAL_SYNC_TRIGGER),
      )
    )),
    tap((x) => dbxLog('sync(effect).....', x)),
    withLatestFrom(isOnline$),
    // don't run multiple after each other when dialog is open
    exhaustMap(([trigger, isOnline]) => {
      if (!isOnline) {
        this._snackService.open({msg: T.F.DROPBOX.S.OFFLINE, type: 'ERROR'});
        if (trigger === SYNC_INITIAL_SYNC_TRIGGER) {
          this._syncService.setInitialSyncDone(true, SyncProvider.Dropbox);
        }
        return;
      }
      return this._dropboxSyncService.sync()
        .then(() => {
          if (trigger === SYNC_INITIAL_SYNC_TRIGGER) {
            this._syncService.setInitialSyncDone(true, SyncProvider.Dropbox);
          }
        })
        .catch((e) => {
          console.error(e);
          this._snackService.open({msg: T.F.DROPBOX.S.SYNC_ERROR, type: 'ERROR'});
        });
    }),
  );

  private _isChangedAuthCode$ = this._dataInitService.isAllDataLoadedInitially$.pipe(
    // NOTE: it is important that we don't use distinct until changed here
    switchMap(() => this._dropboxApiService.authCode$),
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
    withLatestFrom(this._isChangedAuthCode$),
    filter(([, isChanged]: [UpdateGlobalConfigSection, boolean]) => isChanged),
    switchMap(([{payload}, isChanged]: [UpdateGlobalConfigSection, boolean]) =>
      from(this._dropboxApiService.getAccessTokenFromAuthCode((payload.sectionCfg as any).authCode)).pipe(
        // NOTE: catch needs to be limited to request only, otherwise we break the chain
        catchError((e) => {
          console.error(e);
          this._snackService.open({type: 'ERROR', msg: T.F.DROPBOX.S.ACCESS_TOKEN_ERROR});
          // filter
          return EMPTY;
        }),
      )
    ),
    tap(() => setTimeout(() => this._snackService.open({
        type: 'SUCCESS',
        msg: T.F.DROPBOX.S.ACCESS_TOKEN_GENERATED
      }), 200)
    ),
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
