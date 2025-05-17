import { inject, Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import {
  concatMap,
  delay,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  pairwise,
  shareReplay,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { SyncTriggerService } from './sync-trigger.service';
import {
  SYNC_BEFORE_CLOSE_ID,
  SYNC_INITIAL_SYNC_TRIGGER,
} from '../../imex/sync/sync.const';
import { combineLatest, EMPTY, merge, Observable, of } from 'rxjs';
import { isOnline$ } from '../../util/is-online';
import { SnackService } from '../../core/snack/snack.service';
import { T } from '../../t.const';
import { ExecBeforeCloseService } from '../../core/electron/exec-before-close.service';
import { IS_ELECTRON } from '../../app.constants';
import { TaskService } from '../../features/tasks/task.service';
import { SimpleCounterService } from '../../features/simple-counter/simple-counter.service';
import { SyncWrapperService } from './sync-wrapper.service';
import { getSyncErrorStr } from './get-sync-error-str';
import { InitialPwaUpdateCheckService } from '../../core/initial-pwa-update-check.service';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';

@Injectable()
export class SyncEffects {
  private _syncWrapperService = inject(SyncWrapperService);
  private _syncTriggerService = inject(SyncTriggerService);
  private _snackService = inject(SnackService);
  private _taskService = inject(TaskService);
  private _simpleCounterService = inject(SimpleCounterService);
  private _dataInitStateService = inject(DataInitStateService);
  private _execBeforeCloseService = inject(ExecBeforeCloseService);
  private readonly _initialPwaUpdateCheckService = inject(InitialPwaUpdateCheckService);

  syncBeforeQuit$: any = createEffect(
    () =>
      !IS_ELECTRON
        ? EMPTY
        : this._dataInitStateService.isAllDataLoadedInitially$.pipe(
            concatMap(() => this._syncWrapperService.isEnabledAndReady$),
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
              this._syncWrapperService
                .sync()
                .then(() => {
                  this._execBeforeCloseService.setDone(SYNC_BEFORE_CLOSE_ID);
                })
                .catch((e: unknown) => {
                  console.error(e);
                  this._snackService.open({
                    msg: T.F.DROPBOX.S.SYNC_ERROR,
                    type: 'ERROR',
                  });
                  if (confirm('Sync failed. Close App anyway?')) {
                    this._execBeforeCloseService.setDone(SYNC_BEFORE_CLOSE_ID);
                  }
                }),
            ),
          ),
    { dispatch: false },
  );
  // private _wasJustEnabled$: Observable<boolean> = of(false);
  private _wasJustEnabled$: Observable<boolean> =
    this._dataInitStateService.isAllDataLoadedInitially$.pipe(
      // NOTE: it is important that we don't use distinct until changed here
      switchMap(() => this._syncWrapperService.isEnabledAndReady$),
      pairwise(),
      map(([a, b]) => !a && !!b),
      filter((wasJustEnabled) => wasJustEnabled),
      shareReplay(),
    );

  triggerSync$: any = createEffect(
    () =>
      this._dataInitStateService.isAllDataLoadedInitially$.pipe(
        switchMap(() =>
          merge(
            // dynamic
            combineLatest([
              this._syncWrapperService.isEnabledAndReady$,
              this._syncWrapperService.syncInterval$,
            ]).pipe(
              switchMap(([isEnabledAndReady, syncInterval]) =>
                isEnabledAndReady && syncInterval
                  ? this._syncTriggerService.getSyncTrigger$(syncInterval)
                  : EMPTY,
              ),
            ),

            // initial after starting app
            this._initialPwaUpdateCheckService.afterInitialUpdateCheck$.pipe(
              concatMap(() => this._syncWrapperService.isEnabledAndReady$),
              take(1),
              switchMap((isEnabledAndReady) => {
                if (isEnabledAndReady) {
                  return of(SYNC_INITIAL_SYNC_TRIGGER);
                } else {
                  this._syncTriggerService.setInitialSyncDone(true);
                  return EMPTY;
                }
              }),
            ),

            // initial after enabling it,
            // TODO maybe re-enable
            // this._wasJustEnabled$.pipe(take(1), mapTo('SYNC_DBX_AFTER_ENABLE')),
          ),
        ),
        tap((x) => console.log('sync(effect).....', x)),
        withLatestFrom(isOnline$),
        // don't run multiple after each other when dialog is open
        exhaustMap(([trigger, isOnline]) => {
          if (!isOnline) {
            // this._snackService.open({msg: T.F.DROPBOX.S.OFFLINE, type: 'ERROR'});
            if (trigger === SYNC_INITIAL_SYNC_TRIGGER) {
              this._syncTriggerService.setInitialSyncDone(true);
            }
            // we need to return something
            return of(null);
          }
          return this._syncWrapperService
            .sync()
            .then(() => {
              if (trigger === SYNC_INITIAL_SYNC_TRIGGER) {
                this._syncTriggerService.setInitialSyncDone(true);
              }
            })
            .catch((err: unknown) => {
              this._syncTriggerService.setInitialSyncDone(true);
              this._snackService.open({
                msg: T.F.SYNC.S.UNKNOWN_ERROR,
                translateParams: {
                  err: getSyncErrorStr(err),
                },
                type: 'ERROR',
              });
            });
        }),
      ),
    { dispatch: false },
  );
}
