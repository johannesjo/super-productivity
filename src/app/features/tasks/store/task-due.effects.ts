import { inject, Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { concatMap, filter, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { from } from 'rxjs';
import { removeTasksFromTodayTag } from '../../tag/store/tag.actions';
import { Store } from '@ngrx/store';
import { selectOverdueTasksOnToday } from './task.selectors';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { sortRepeatableTaskCfgs } from '../../task-repeat-cfg/sort-repeatable-task-cfg';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { DateService } from '../../../core/date/date.service';
import { DataInitStateService } from '../../../core/data-init/data-init-state.service';
import { SyncWrapperService } from '../../../imex/sync/sync-wrapper.service';

@Injectable()
export class TaskDueEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject(Store);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);
  private _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private _dateService = inject(DateService);
  private _dataInitStateService = inject(DataInitStateService);
  private _syncWrapperService = inject(SyncWrapperService);

  removeOverdueFormToday$ = createEffect(() => {
    return this._dataInitStateService.isAllDataLoadedInitially$.pipe(
      switchMap(() => this._syncWrapperService.afterCurrentSyncDoneOrSyncDisabled$),
      switchMap(() => this._globalTrackingIntervalService.todayDateStr$),
      switchMap(() => this._store$.select(selectOverdueTasksOnToday)),
      filter((overdue) => !!overdue.length),
      map((overdue) => removeTasksFromTodayTag({ taskIds: overdue.map((t) => t.id) })),
    );
  });

  createRepeatableTasks$ = createEffect(
    () => {
      return this._dataInitStateService.isAllDataLoadedInitially$.pipe(
        switchMap(() => this._syncWrapperService.afterCurrentSyncDoneOrSyncDisabled$),
        concatMap(() => this._globalTrackingIntervalService.todayDateStr$),
        concatMap(() =>
          this._taskRepeatCfgService.getRepeatableTasksDueForDayIncludingOverdue$(
            Date.now(),
          ),
        ),
        tap((v) => console.log('2', v)),
        filter((taskRepeatCfgs) => taskRepeatCfgs && !!taskRepeatCfgs.length),
        mergeMap((taskRepeatCfgs) => {
          // NOTE sorting here is important
          const sorted = taskRepeatCfgs.sort(sortRepeatableTaskCfgs);
          return from(sorted).pipe(
            mergeMap((taskRepeatCfg: TaskRepeatCfg) =>
              this._taskRepeatCfgService.getActionsForTaskRepeatCfg(
                taskRepeatCfg,
                // TODO check if still needed?
                Date.now() - this._dateService.startOfNextDayDiff,
              ),
            ),
            concatMap((actionsForRepeatCfg) => from(actionsForRepeatCfg)),
          );
        }),
      );
    },
    {
      dispatch: true,
    },
  );

  //
  // private triggerRepeatableTaskCreation$ = merge(
  //   this._syncTriggerService.afterInitialSyncDoneAndDataLoadedInitially$,
  //   this._actions$.pipe(
  //     ofType(setActiveWorkContext),
  //     concatMap(() => this._syncWrapperService.afterCurrentSyncDoneOrSyncDisabled$),
  //   ),
  // ).pipe(
  //   // make sure everything has settled
  //   delay(1000),
  // );
  //
  // createRepeatableTasks: any = createEffect(() =>
  //   this.triggerRepeatableTaskCreation$.pipe(
  //     concatMap(
  //       () =>
  //         this._taskRepeatCfgService
  //           .getRepeatTableTasksDueForDayIncludingOverdue$(
  //             Date.now() - this._dateService.startOfNextDayDiff,
  //           )
  //           .pipe(first()),
  //       // ===> taskRepeatCfgs scheduled for today and not yet created already
  //     ),
  //     filter((taskRepeatCfgs) => taskRepeatCfgs && !!taskRepeatCfgs.length),
  //     withLatestFrom(this._taskService.currentTaskId$),
  //
  //     // existing tasks with sub-tasks are loaded, because need to move them to the archive
  //     mergeMap(([taskRepeatCfgs, currentTaskId]) => {
  //       // NOTE sorting here is important
  //       const sorted = taskRepeatCfgs.sort(sortRepeatableTaskCfgs);
  //       return from(sorted).pipe(
  //         mergeMap((taskRepeatCfg: TaskRepeatCfg) =>
  //           this._taskRepeatCfgService.getActionsForTaskRepeatCfg(
  //             taskRepeatCfg,
  //             Date.now() - this._dateService.startOfNextDayDiff,
  //           ),
  //         ),
  //         concatMap((actionsForRepeatCfg) => from(actionsForRepeatCfg)),
  //       );
  //     }),
  //   ),
  // );
}
