import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { delay, first, switchMap, tap } from 'rxjs/operators';
import { selectAllTasksDueAndOverdue } from './task.selectors';
import { SyncTriggerService } from '../../../imex/sync/sync-trigger.service';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { merge } from 'rxjs';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';

@Injectable()
export class TaskCreateAllDueEffects {
  private _actions$ = inject(Actions);
  private _store = inject(Store);
  private _syncTriggerService = inject(SyncTriggerService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);

  checkToAddTasksTrigger$ = createEffect(
    () => {
      return this._syncTriggerService.afterInitialSyncDoneAndDataLoadedInitially$.pipe(
        switchMap(() => {
          // check when reloading data
          return merge(
            this._actions$.pipe(
              ofType(loadAllData),
              switchMap(() =>
                this._globalTrackingIntervalService.todayDateStr$.pipe(first()),
              ),
            ),
            this._globalTrackingIntervalService.todayDateStr$.pipe(
              // wait a bit for other stuff as days$ might not be up-to-date
              delay(1400),
            ),
          );
        }),

        switchMap((todayStr) => this._store.pipe(select(selectAllTasksDueAndOverdue))),
        tap((v) => console.log('xxxx', v)),
      );
    },
    { dispatch: false },
  );
}
