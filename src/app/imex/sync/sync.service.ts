import { Injectable } from '@angular/core';
import { combineLatest, EMPTY, fromEvent, merge, Observable, of, ReplaySubject, throwError } from 'rxjs';
import {
  auditTime, catchError,
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
  throttleTime, timeout
} from 'rxjs/operators';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { SyncProvider } from './sync-provider';
import { DataInitService } from '../../core/data-init/data-init.service';
import { isOnline$ } from '../../util/is-online';
import { PersistenceService } from '../../core/persistence/persistence.service';
import {
  SYNC_ACTIVITY_AFTER_SOMETHING_ELSE_THROTTLE_TIME,
  SYNC_BEFORE_GOING_TO_SLEEP_THROTTLE_TIME,
  SYNC_DEFAULT_AUDIT_TIME
} from './sync.const';
import { IS_TOUCH_ONLY } from '../../util/is-touch';
import { AllowedDBKeys } from '../../core/persistence/ls-keys.const';
import { IdleService } from '../../features/time-tracking/idle.service';
import { AppDataComplete } from './sync.model';
import { IS_ELECTRON } from '../../app.constants';
import { ElectronService } from '../../core/electron/electron.service';
import { IpcRenderer } from 'electron';
import { IPC } from '../../../../electron/ipc-events.const';

// TODO naming
@Injectable({
  providedIn: 'root',
})
export class SyncService {
  inMemoryComplete$: Observable<AppDataComplete> = this._persistenceService.inMemoryComplete$.pipe(
    timeout(5000),
    catchError(() => throwError('Error while trying to get inMemoryComplete$')),
  );

  private _onUpdateLocalDataTrigger$: Observable<{ appDataKey: AllowedDBKeys, data: any, isDataImport: boolean, projectId?: string }> =
    this._persistenceService.onAfterSave$.pipe(
      filter(({appDataKey, data, isDataImport, isSyncModelChange}) => !!data && !isDataImport && isSyncModelChange),
    );

  // IMMEDIATE TRIGGERS
  // ----------------------
  private _mouseMoveAfterIdle$: Observable<string | never> = this._idleService.isIdle$.pipe(
    distinctUntilChanged(),
    switchMap((isIdle) => isIdle
      ? fromEvent(window, 'mousemove').pipe(
        take(1),
        mapTo('I_MOUSE_MOVE_AFTER_IDLE'),
      )
      : EMPTY
    )
  );

  private _activityAfterSomethingElseTriggers$: Observable<string> = merge(
    fromEvent(window, 'focus').pipe(mapTo('I_FOCUS_THROTTLED')),

    IS_ELECTRON
      ? fromEvent((this._electronService.ipcRenderer as IpcRenderer), IPC.RESUME).pipe(mapTo('I_IPC_RESUME'))
      : EMPTY,

    IS_TOUCH_ONLY
      ? merge(
      fromEvent(window, 'touchstart'),
      fromEvent(window, 'visibilitychange'),
      ).pipe(mapTo('I_MOUSE_TOUCH_MOVE_OR_VISIBILITYCHANGE'))
      : EMPTY,

    this._mouseMoveAfterIdle$
  ).pipe(
    throttleTime(SYNC_ACTIVITY_AFTER_SOMETHING_ELSE_THROTTLE_TIME),
  );

  private _beforeGoingToSleepTriggers$: Observable<string> = merge(
    IS_ELECTRON
      ? fromEvent((this._electronService.ipcRenderer as IpcRenderer), IPC.SUSPEND).pipe(mapTo('I_IPC_SUSPEND'))
      : EMPTY,
  ).pipe(
    throttleTime(SYNC_BEFORE_GOING_TO_SLEEP_THROTTLE_TIME)
  );

  private _isOnlineTrigger$: Observable<string> = isOnline$.pipe(
    // skip initial online which always fires on page load
    skip(1),
    filter(isOnline => isOnline),
    mapTo('IS_ONLINE'),
  );

  // OTHER INITIAL SYNC STUFF
  private _immediateSyncTrigger$: Observable<string> = merge(
    this._activityAfterSomethingElseTriggers$,
    this._beforeGoingToSleepTriggers$,
    this._isOnlineTrigger$,
  );
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
  private _isInitialSyncDoneManual$: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
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

  constructor(
    private readonly _globalConfigService: GlobalConfigService,
    private readonly _dataInitService: DataInitService,
    private readonly _idleService: IdleService,
    private readonly _persistenceService: PersistenceService,
    private readonly _electronService: ElectronService,
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
        switchMap(() => this._onUpdateLocalDataTrigger$.pipe(
          tap((ev) => console.log('__trigger_sync__', ev.appDataKey, ev)),
          auditTime(Math.max(syncInterval, minSyncInterval)),
          tap((ev) => console.log('__trigger_sync after auditTime__', ev.appDataKey, ev)),
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
