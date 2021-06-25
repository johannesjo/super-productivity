import { Injectable } from '@angular/core';
import { Effect } from '@ngrx/effects';
import {
  concatMap,
  delay,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  mapTo,
  pairwise,
  shareReplay,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { DataInitService } from '../../core/data-init/data-init.service';
import { SyncService } from '../../imex/sync/sync.service';
import {
  SYNC_BEFORE_CLOSE_ID,
  SYNC_INITIAL_SYNC_TRIGGER,
  SYNC_MIN_INTERVAL,
} from '../../imex/sync/sync.const';
import { combineLatest, EMPTY, merge, Observable, of } from 'rxjs';
import { isOnline$ } from '../../util/is-online';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { ExecBeforeCloseService } from '../../core/electron/exec-before-close.service';
import { IS_ELECTRON } from '../../app.constants';
import { TaskService } from '../../features/tasks/task.service';
import { SimpleCounterService } from '../../features/simple-counter/simple-counter.service';
import { SyncProviderService } from './sync-provider.service';
import { getSyncErrorStr } from './get-sync-error-str';

@Injectable()
export class SyncEffects {
  @Effect({ dispatch: false }) syncBeforeQuit$: any = !IS_ELECTRON
    ? EMPTY
    : this._dataInitService.isAllDataLoadedInitially$.pipe(
        concatMap(() => this._syncProviderService.isEnabledAndReady$),
        distinctUntilChanged(),
        tap((isEnabled) =>
          isEnabled
            ? this._execBeforeCloseService.schedule(SYNC_BEFORE_CLOSE_ID)
            : this._execBeforeCloseService.unschedule(SYNC_BEFORE_CLOSE_ID),
        ),
        switchMap((isEnabled) =>
          isEnabled ? this._execBeforeCloseService.onBeforeClose$ : EMPTY,
        ),
        filter((ids) => ids.includes(SYNC_BEFORE_CLOSE_ID)),
        tap(() => {
          this._taskService.setCurrentId(null);
          this._simpleCounterService.turnOffAll();
        }),
        // minimally hacky delay to wait for inMemoryDatabase update...
        delay(100),
        switchMap(() =>
          this._syncProviderService
            .sync()
            .then(() => {
              this._execBeforeCloseService.setDone(SYNC_BEFORE_CLOSE_ID);
            })
            .catch((e: unknown) => {
              console.error(e);
              this._snackService.open({ msg: T.F.DROPBOX.S.SYNC_ERROR, type: 'ERROR' });
              if (confirm('Sync failed. Close App anyway?')) {
                this._execBeforeCloseService.setDone(SYNC_BEFORE_CLOSE_ID);
              }
            }),
        ),
      );
  // private _wasJustEnabled$: Observable<boolean> = of(false);
  private _wasJustEnabled$: Observable<boolean> =
    this._dataInitService.isAllDataLoadedInitially$.pipe(
      // NOTE: it is important that we don't use distinct until changed here
      switchMap(() => this._syncProviderService.isEnabledAndReady$),
      pairwise(),
      map(([a, b]) => !a && !!b),
      filter((wasJustEnabled) => wasJustEnabled),
      shareReplay(),
    );
  @Effect({ dispatch: false })
  triggerSync$: any = this._dataInitService.isAllDataLoadedInitially$.pipe(
    switchMap(() =>
      merge(
        // dynamic
        combineLatest([
          this._syncProviderService.isEnabledAndReady$,
          this._syncProviderService.syncInterval$,
        ]).pipe(
          switchMap(([isEnabledAndReady, syncInterval]) =>
            isEnabledAndReady
              ? this._syncService.getSyncTrigger$(syncInterval, SYNC_MIN_INTERVAL)
              : EMPTY,
          ),
        ),

        // initial after starting app
        this._syncProviderService.isEnabledAndReady$.pipe(
          take(1),
          withLatestFrom(this._syncProviderService.isEnabled$),
          switchMap(([isEnabledAndReady, isEnabled]) => {
            if (isEnabledAndReady) {
              return of(SYNC_INITIAL_SYNC_TRIGGER);
            } else {
              if (isEnabled) {
                this._snackService.open({
                  msg: T.F.SYNC.S.INITIAL_SYNC_ERROR,
                  type: 'ERROR',
                });
              }
              this._syncService.setInitialSyncDone(true);
              return EMPTY;
            }
          }),
        ),

        // initial after enabling it,
        this._wasJustEnabled$.pipe(take(1), mapTo('SYNC_DBX_AFTER_ENABLE')),
      ),
    ),
    tap((x) => console.log('sync(effect).....', x)),
    withLatestFrom(isOnline$),
    // don't run multiple after each other when dialog is open
    exhaustMap(([trigger, isOnline]) => {
      if (!isOnline) {
        // this._snackService.open({msg: T.F.DROPBOX.S.OFFLINE, type: 'ERROR'});
        if (trigger === SYNC_INITIAL_SYNC_TRIGGER) {
          this._syncService.setInitialSyncDone(true);
        }
        // we need to return something
        return of(null);
      }
      return this._syncProviderService
        .sync()
        .then(() => {
          if (trigger === SYNC_INITIAL_SYNC_TRIGGER) {
            this._syncService.setInitialSyncDone(true);
          }
        })
        .catch((err: unknown) => {
          this._syncService.setInitialSyncDone(true);
          this._snackService.open({
            msg: T.F.SYNC.S.UNKNOWN_ERROR,
            translateParams: {
              err: getSyncErrorStr(err),
            },
            type: 'ERROR',
          });
        });
    }),
  );

  constructor(
    private _syncProviderService: SyncProviderService,
    private _syncService: SyncService,
    private _snackService: SnackService,
    private _taskService: TaskService,
    private _simpleCounterService: SimpleCounterService,
    private _dataInitService: DataInitService,
    private _execBeforeCloseService: ExecBeforeCloseService,
  ) {}
}
