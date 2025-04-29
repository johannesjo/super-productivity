import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { delay, first, switchMap, tap } from 'rxjs/operators';
import { SyncTriggerService } from '../../../imex/sync/sync-trigger.service';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { merge } from 'rxjs';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { DateService } from '../../../core/date/date.service';
import { AddTasksForTomorrowService } from '../../add-tasks-for-tomorrow/add-tasks-for-tomorrow.service';

@Injectable()
export class TaskCreateAllDueEffects {
  private _actions$ = inject(Actions);
  private _store = inject(Store);
  private _syncTriggerService = inject(SyncTriggerService);
  private _dateService = inject(DateService);
  private _taskRepeatCfgService = inject(TaskRepeatCfgService);
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
        tap((v) => console.log('xxxx', v)),
        tap((v) => {
          if (confirm('Create all due tasks?')) {
            this._addTasksForTomorrowService.addAllDueToday();
          }
        }),
      );
    },
    { dispatch: false },
  );
}
