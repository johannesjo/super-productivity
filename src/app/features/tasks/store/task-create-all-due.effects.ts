import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { delay, first, switchMap, tap } from 'rxjs/operators';
import { SyncTriggerService } from '../../../imex/sync/sync-trigger.service';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { merge } from 'rxjs';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { AddTasksForTomorrowService } from '../../add-tasks-for-tomorrow/add-tasks-for-tomorrow.service';
import { SnackService } from '../../../core/snack/snack.service';

@Injectable()
export class TaskCreateAllDueEffects {
  private _actions$ = inject(Actions);
  private _syncTriggerService = inject(SyncTriggerService);
  private _snackService = inject(SnackService);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);
  private _addTasksForTomorrowService = inject(AddTasksForTomorrowService);

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
        tap(async (v) => {
          // if (!confirm('Create all due tasks?')) return;

          if ((await this._addTasksForTomorrowService.addAllDueToday()) === 'ADDED') {
            setTimeout(() => {
              // TODO add move to list button if not on today list
              this._snackService.open({
                ico: 'today',
                msg: 'Added all due and repeating tasks for today',
              });
            }, 10);
          }
        }),
      );
    },
    { dispatch: false },
  );
}
