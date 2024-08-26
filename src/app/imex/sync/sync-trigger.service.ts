import { Injectable } from '@angular/core';
import { EMPTY, fromEvent, merge, Observable, of, ReplaySubject, timer } from 'rxjs';
import {
  auditTime,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  filter,
  first,
  map,
  mapTo,
  shareReplay,
  skip,
  startWith,
  switchMap,
  take,
  tap,
  throttleTime,
} from 'rxjs/operators';
import { GlobalConfigService } from '../../features/config/global-config.service';
import { DataInitService } from '../../core/data-init/data-init.service';
import { isOnline$ } from '../../util/is-online';
import { PersistenceService } from '../../core/persistence/persistence.service';
import {
  SYNC_BEFORE_GOING_TO_SLEEP_THROTTLE_TIME,
  SYNC_DEFAULT_AUDIT_TIME,
} from './sync.const';
import { AllowedDBKeys } from '../../core/persistence/storage-keys.const';
import { IdleService } from '../../features/idle/idle.service';
import { IS_ELECTRON } from '../../app.constants';
import { GlobalConfigState } from '../../features/config/global-config.model';
import { IS_ANDROID_WEB_VIEW } from '../../util/is-android-web-view';
import { androidInterface } from '../../features/android/android-interface';
import { ipcResume$, ipcSuspend$ } from '../../core/ipc-events';
import { IS_TOUCH_PRIMARY } from '../../util/is-mouse-primary';

const MAX_WAIT_FOR_INITIAL_SYNC = 25000;
const USER_INTERACTION_SYNC_CHECK_THROTTLE_TIME = 15 * 60 * 10000;

// TODO naming
@Injectable({
  providedIn: 'root',
})
export class SyncTriggerService {
  private _onUpdateLocalDataTrigger$: Observable<{
    appDataKey: AllowedDBKeys;
    data: any;
    isDataImport: boolean;
    projectId?: string;
  }> = this._persistenceService.onAfterSave$.pipe(
    filter(
      ({ appDataKey, data, isDataImport, isSyncModelChange }) =>
        !!data && !isDataImport && isSyncModelChange,
    ),
  );

  // IMMEDIATE TRIGGERS
  // ----------------------
  private _mouseMoveAfterIdleOrUserInteractionFallbackTrigger$: Observable<
    string | never
  > = this._globalConfigService.idle$.pipe(
    switchMap((idleCfg) =>
      idleCfg.isEnableIdleTimeTracking
        ? // idle should be a good indicator for remote data changes
          this._idleService.isIdle$.pipe(
            distinctUntilChanged(),
            switchMap((isIdle) =>
              isIdle
                ? fromEvent(window, 'mousemove').pipe(
                    // we throttle this to prevent lots of updates, but
                    // but also cover the case when the user doesn't interact with the idle dialog
                    throttleTime(60 * 1000),
                    mapTo('I_MOUSE_MOVE_AFTER_IDLE_THROTTLED'),
                  )
                : EMPTY,
            ),
          )
        : // FALLBACK we check if there was any kind of user interaction
          // (otherwise sync might never be checked if there are no local data changes)
          IS_TOUCH_PRIMARY
          ? merge(
              fromEvent(window, 'touchstart'),
              fromEvent(window, 'visibilitychange'),
            ).pipe(
              mapTo('I_MOUSE_TOUCH_MOVE_OR_VISIBILITYCHANGE'),
              throttleTime(USER_INTERACTION_SYNC_CHECK_THROTTLE_TIME),
            )
          : fromEvent(window, 'focus').pipe(
              mapTo('I_FOCUS_THROTTLED'),
              throttleTime(USER_INTERACTION_SYNC_CHECK_THROTTLE_TIME),
            ),
    ),
  );

  private _onIdleTrigger$: Observable<string | never> = this._idleService.isIdle$.pipe(
    distinctUntilChanged(),
    switchMap((isIdle) =>
      isIdle
        ? // NOTE: wait for a second for all possible data changes and disabling timers to take place
          timer(1000).pipe(mapTo('I_ON_IDLE'))
        : EMPTY,
    ),
  );

  // TODO check if those two work as expected
  private _onElectronResumeTrigger$: Observable<string | never> = IS_ELECTRON
    ? ipcResume$.pipe(
        // because ipcEvents live forever
        mapTo('I_IPC_RESUME'),
      )
    : EMPTY;
  private _beforeGoingToSleepTriggers$: Observable<string | never> = IS_ELECTRON
    ? ipcSuspend$.pipe(
        // because ipcEvents live forever
        mapTo('I_IPC_SUSPEND'),
        throttleTime(SYNC_BEFORE_GOING_TO_SLEEP_THROTTLE_TIME),
      )
    : EMPTY;

  private _isOnlineTrigger$: Observable<string> = isOnline$.pipe(
    // skip initial online which always fires on page load
    skip(1),
    filter((isOnline) => isOnline),
    mapTo('I_IS_ONLINE'),
  );

  // OTHER INITIAL SYNC STUFF
  // ------------------------
  private _isInitialSyncEnabled$: Observable<boolean> =
    this._dataInitService.isAllDataLoadedInitially$.pipe(
      switchMap(() => this._globalConfigService.cfg$),
      map((cfg: GlobalConfigState) => cfg.sync.isEnabled),
      distinctUntilChanged(),
    );

  // keep it super simple for now
  private _isInitialSyncDoneManual$: ReplaySubject<boolean> = new ReplaySubject<boolean>(
    1,
  );
  private _isInitialSyncDone$: Observable<boolean> = this._isInitialSyncEnabled$.pipe(
    switchMap((isActive) => {
      return isActive ? this._isInitialSyncDoneManual$.asObservable() : of(true);
    }),
  );
  private _afterInitialSyncDoneAndDataLoadedInitially$: Observable<boolean> =
    this._isInitialSyncDone$.pipe(
      filter((isDone) => isDone),
      take(1),
      // should normally be already loaded, but if there is NO initial sync we need to wait here
      concatMap(() => this._dataInitService.isAllDataLoadedInitially$),
    );

  // NOTE: can be called multiple times apparently
  afterInitialSyncDoneAndDataLoadedInitially$: Observable<boolean> = merge(
    this._afterInitialSyncDoneAndDataLoadedInitially$,
    timer(MAX_WAIT_FOR_INITIAL_SYNC).pipe(mapTo(true)),
  ).pipe(first(), shareReplay(1));

  constructor(
    private readonly _globalConfigService: GlobalConfigService,
    private readonly _dataInitService: DataInitService,
    private readonly _idleService: IdleService,
    private readonly _persistenceService: PersistenceService,
  ) {}

  getSyncTrigger$(
    syncInterval: number = SYNC_DEFAULT_AUDIT_TIME,
    minSyncInterval: number = 5000,
  ): Observable<unknown> {
    const _immediateSyncTrigger$: Observable<string> = IS_ANDROID_WEB_VIEW
      ? // ANDROID ONLY
        merge(
          // to update in background for widget
          androidInterface.isInBackground$.pipe(
            switchMap((isInBackground) =>
              isInBackground
                ? timer(syncInterval, syncInterval).pipe(
                    mapTo('I_MOBILE_ONLY_BACKGROUND_TIMER'),
                  )
                : EMPTY,
            ),
          ),
          androidInterface.onResume$.pipe(throttleTime(10000), mapTo('I_RESUME_APP')),
          androidInterface.onPause$.pipe(throttleTime(10000), mapTo('I_PAUSE_APP')),
          this._isOnlineTrigger$,
        )
      : // EVERYTHING ELSE
        merge(
          this._mouseMoveAfterIdleOrUserInteractionFallbackTrigger$,
          this._beforeGoingToSleepTriggers$,
          this._isOnlineTrigger$,
          this._onIdleTrigger$,
          this._onElectronResumeTrigger$,
        );

    return merge(
      // once immediately
      _immediateSyncTrigger$.pipe(tap((v) => console.log('immediate sync trigger', v))),

      // and once we reset the sync interval for all other triggers
      // we do this to reset the audit time to avoid sync checks in short succession
      _immediateSyncTrigger$.pipe(
        // NOTE: startWith needs to come before switchMap!
        // NOTE2: we use startWith, since we want to start listening to the onUpdateLocalDataTrigger right away
        startWith('INITIAL_TIMER_TRIGGER'),
        switchMap(() =>
          // NOTE: interval changes are only ever executed, if local data was changed
          this._onUpdateLocalDataTrigger$.pipe(
            // tap((ev) => console.log('__trigger_sync__', ev.appDataKey, ev)),
            tap((ev) => console.log('__trigger_sync__', ev.appDataKey)),
            auditTime(Math.max(syncInterval, minSyncInterval)),
            // tap((ev) =>
            //   console.log('__trigger_sync after auditTime__', ev.appDataKey, ev),
            // ),
          ),
        ),
      ),
    ).pipe(debounceTime(100));
  }

  setInitialSyncDone(val: boolean): void {
    this._isInitialSyncDoneManual$.next(val);
  }
}
