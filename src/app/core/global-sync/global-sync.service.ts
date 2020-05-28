import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, fromEvent, merge, Observable, of, ReplaySubject, timer} from 'rxjs';
import {
  auditTime,
  concatMap,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  shareReplay,
  skip,
  startWith,
  switchMap,
  take,
  tap
} from 'rxjs/operators';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {SyncProvider} from './sync-provider';
import {DataInitService} from '../data-init/data-init.service';
import {isOnline$} from '../../util/is-online';
import {PersistenceService} from '../persistence/persistence.service';
import {AppDataComplete} from '../../imex/sync/sync.model';


const BS_AUDIT_TIME = 10000;
const TRIGGER_FOCUS_AGAIN_TIMEOUT_DURATION = BS_AUDIT_TIME + 3000;

@Injectable({
  providedIn: 'root',
})
export class GlobalSyncService {
  // UPDATE LOCAL
  // ------------
  private _checkRemoteUpdateTriggers$: Observable<string> = merge(
    fromEvent(window, 'focus').pipe(
      switchMap((ev) => isOnline$.pipe(
        filter(isOnline => isOnline),
      )),
      switchMap(() => timer(TRIGGER_FOCUS_AGAIN_TIMEOUT_DURATION).pipe(
        mapTo('FOCUS DELAYED'),
        startWith('FOCUS') // until the timer fires, you'll have this value
      ))
    ),
    isOnline$.pipe(
      // skip initial online which always fires on page load
      skip(1),
      filter(isOnline => isOnline),
      mapTo('IS_ONLINE'),
    ),
  );

  // SAVE TO REMOTE
  // --------------
  private _saveToRemoteTrigger$: Observable<unknown> = this._persistenceService.onAfterSave$.pipe(
    filter(({appDataKey, data, isDataImport}) => !!data && !isDataImport),
  );

  private _isInitialSyncEnabled$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    switchMap(() => combineLatest([
        this._globalConfigService.googleDriveSyncCfg$.pipe(
          map(cfg => cfg && cfg.isEnabled && cfg.isLoadRemoteDataOnStartup && cfg.isAutoLogin),
        ),
      ]).pipe(
      map(all => all.includes(true)),
      )
    ),
    distinctUntilChanged(),
  );

  // keep it super simple for now
  private _isInitialSyncDoneManual$ = new ReplaySubject<boolean>(1);

  private _isInitialSyncDone$: Observable<boolean> = this._isInitialSyncEnabled$.pipe(
    switchMap((isActive) => {
      return isActive
        ? this._isInitialSyncDoneManual$.asObservable()
        : of(true);
    }),
    startWith(false),
  );

  afterInitialSyncDoneAndDataLoadedInitially$: Observable<boolean> = this._isInitialSyncDone$.pipe(
    filter(isDone => isDone),
    take(1),
    // should normally be already loaded, but if there is NO initial sync we need to wait here
    concatMap(() => this._dataInitService.isAllDataLoadedInitially$),
    shareReplay(1),
  );


  inMemory$: Observable<AppDataComplete> = this._persistenceService.inMemoryComplete$;

  constructor(
    private readonly _store: Store<any>,
    private readonly _globalConfigService: GlobalConfigService,
    private readonly _dataInitService: DataInitService,
    private readonly _persistenceService: PersistenceService,
  ) {
  }

  getSyncTrigger$(syncInterval: number = BS_AUDIT_TIME): Observable<unknown> {
    return merge(
      this._checkRemoteUpdateTriggers$,
      this._saveToRemoteTrigger$,
    ).pipe(
      tap((ev) => console.log('__TRIGGER SYNC__', ev)),
      auditTime(syncInterval),
      tap((ev) => console.log('__TRIGGER SYNC AFTER AUDITTIME__', ev)),
      // switchMap(() => this._checkForRemoteUpdateAndSync()),
    );
  }

  // tslint:disable-next-line
  setInitialSyncDone(val: boolean, syncProvider: SyncProvider) {
    this._isInitialSyncDoneManual$.next(val);
  }

  private async _checkForRemoteUpdateAndSync() {
    // const remote = await this._read(COMPLETE_KEY);
    // const local = await this._persistenceService.inMemoryComplete$.pipe(take(1)).toPromise();
    // const lastSync = this._getLasSync();
    //
    // if (!remote || !local) {
    //   throw new Error('No data available');
    // }
    // // console.log('isImport', local.lastLocalSyncModelChange < remote.lastLocalSyncModelChange,
    // //   (local.lastLocalSyncModelChange - remote.lastLocalSyncModelChange) / 1000,
    // //   local.lastLocalSyncModelChange, remote.lastLocalSyncModelChange);
    //
    // switch (checkForUpdate({
    //   local: local.lastLocalSyncModelChange,
    //   lastSync,
    //   remote: remote.lastLocalSyncModelChange
    // })) {
    //   case UpdateCheckResult.InSync: {
    //     console.log('BS: In Sync => No Update');
    //     break;
    //   }
    //
    //   case UpdateCheckResult.LocalUpdateRequired: {
    //     console.log('BS: Update Local');
    //     return await this._importRemote(remote);
    //   }
    //
    //   case UpdateCheckResult.RemoteUpdateRequired: {
    //     console.log('BS: Remote Update Required => Update directly');
    //     return await this._updateRemote(local);
    //   }
    //
    //   case UpdateCheckResult.DataDiverged: {
    //     console.log('^--------^-------^');
    //     console.log('BS: X Diverged Data');
    //     alert('NO HANDLING YET');
    //     if (confirm('Import?')) {
    //       return await this._importRemote(remote);
    //     }
    //     break;
    //   }
    //
    //   case UpdateCheckResult.LastSyncNotUpToDate: {
    //     this._setLasSync(local.lastLocalSyncModelChange);
    //   }
    // }
  }
}
