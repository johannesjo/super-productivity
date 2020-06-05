import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, EMPTY, fromEvent, merge, Observable, of, ReplaySubject} from 'rxjs';
import {
  auditTime,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  shareReplay,
  skip,
  startWith,
  switchMap,
  take,
  tap,
  throttleTime
} from 'rxjs/operators';
import {GlobalConfigService} from '../../features/config/global-config.service';
import {SyncProvider} from './sync-provider';
import {DataInitService} from '../../core/data-init/data-init.service';
import {isOnline$} from '../../util/is-online';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {AppDataComplete} from './sync.model';
import {SYNC_DEFAULT_AUDIT_TIME, SYNC_USER_ACTIVITY_CHECK_THROTTLE_TIME} from './sync.const';
import {isTouch} from '../../util/is-touch';

// TODO naming
@Injectable({
  providedIn: 'root',
})
export class SyncService {
  // SAVE TO REMOTE TRIGGER
  // ----------------------
  private _updateLocalData$: Observable<unknown> = this._persistenceService.onAfterSave$.pipe(
    filter(({appDataKey, data, isDataImport}) => !!data && !isDataImport),
  );

  // IMMEDIATE TRIGGERS
  // ------------------
  private _focusAppTrigger$ = fromEvent(window, 'focus').pipe(
    throttleTime(SYNC_USER_ACTIVITY_CHECK_THROTTLE_TIME),
    mapTo('I_FOCUS_THROTTLED'),
  );

  // we might need this for mobile, as we can't rely on focus as much
  private _someMobileActivityTrigger$ = of(isTouch()).pipe(
    switchMap((isTouchIn) => isTouchIn
      ? fromEvent(window, 'touchstart').pipe(
        throttleTime(SYNC_USER_ACTIVITY_CHECK_THROTTLE_TIME),
        mapTo('I_MOUSE_TOUCH_MOVE'),
      )
      : EMPTY
    ),
  );

  private _isOnlineTrigger$ = isOnline$.pipe(
    // skip initial online which always fires on page load
    skip(1),
    filter(isOnline => isOnline),
    mapTo('IS_ONLINE'),
  );

  private _immediateSyncTrigger$ = merge(
    this._focusAppTrigger$,
    this._someMobileActivityTrigger$,
    this._isOnlineTrigger$,
  );


  // OTHER INITIAL SYNC STUFF
  // ------------------------
  private _isInitialSyncEnabled$: Observable<boolean> = this._dataInitService.isAllDataLoadedInitially$.pipe(
    switchMap(() => combineLatest([
        // GoogleDrive
        this._globalConfigService.googleDriveSyncCfg$.pipe(
          map(cfg => cfg && cfg.isEnabled && cfg.isLoadRemoteDataOnStartup && cfg.isAutoLogin),
        ),
        // Dropbox
        this._globalConfigService.cfg$.pipe(
          map(cfg => cfg.dropboxSync),
          map(cfg => cfg && cfg.isEnabled && !!cfg.accessToken),
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
    // this.getSyncTrigger$(5000).subscribe((v) => console.log('.getSyncTrigger$(5000)', v));
  }

  getSyncTrigger$(syncInterval: number = SYNC_DEFAULT_AUDIT_TIME, minSyncInterval: number = 5000): Observable<unknown> {
    return merge(
      this._immediateSyncTrigger$,

      // we do this to reset the audit time to avoid sync checks in short succession
      this._immediateSyncTrigger$.pipe(
        // NOTE: startWith needs to come before switchMap!
        startWith(false),
        switchMap(() => this._updateLocalData$.pipe(
          tap((ev) => console.log('__trigger_sync__', ev)),
          auditTime(Math.max(syncInterval, minSyncInterval)),
          tap((ev) => console.log('__trigger_sync after auditTime__', ev)),
        )),
      )
    ).pipe(
      debounceTime(100)
    );
  }

  // tslint:disable-next-line
  setInitialSyncDone(val: boolean, syncProvider: SyncProvider) {
    this._isInitialSyncDoneManual$.next(val);
  }
}
