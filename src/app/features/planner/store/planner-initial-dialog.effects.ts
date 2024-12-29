import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { delay, exhaustMap, first, map, switchMap } from 'rxjs/operators';
import { combineLatest, EMPTY, merge, of } from 'rxjs';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { select, Store } from '@ngrx/store';
import { selectTodayTaskIds } from '../../work-context/store/work-context.selectors';
import { selectPlannerState } from './planner.selectors';
import { devError } from '../../../util/dev-error';
import { getAllMissingPlannedTaskIdsForDay } from '../util/get-all-missing-planned-task-ids-for-day';
import { selectTasksById } from '../../tasks/store/task.selectors';
import { DialogAddPlannedTasksComponent } from '../dialog-add-planned-tasks/dialog-add-planned-tasks.component';
import { PlannerActions } from './planner.actions';
import { SyncTriggerService } from '../../../imex/sync/sync-trigger.service';
import { MatDialog } from '@angular/material/dialog';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { PlannerService } from '../planner.service';

@Injectable()
export class PlannerInitialDialogEffects {
  private _actions$ = inject(Actions);
  private _store = inject(Store);
  private _syncTriggerService = inject(SyncTriggerService);
  private _matDialog = inject(MatDialog);
  private _globalTrackingIntervalService = inject(GlobalTrackingIntervalService);
  private _plannerService = inject(PlannerService);

  // INITIAL DIALOG
  // ---------------
  showDialogAfterAppLoad$ = createEffect(
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

        switchMap((todayStr) =>
          combineLatest([
            of(todayStr),
            this._plannerService.plannerDayForAllDueToday$,
            this._store.pipe(select(selectTodayTaskIds)),
            this._store.pipe(select(selectPlannerState)),
          ]).pipe(first()),
        ),
        exhaustMap(([todayStr, plannerDay, todayTaskIds, plannerState]) => {
          // console.log({
          //   todayStr,
          //   a: plannerState.addPlannedTasksDialogLastShown,
          //   b: new Date(plannerState.addPlannedTasksDialogLastShown as any),
          // });

          if (todayStr === plannerState.addPlannedTasksDialogLastShown) {
            return EMPTY;
          }
          console.log(plannerDay);
          if (!plannerDay) {
            devError('showDialogAfterAppLoad$(): No planner day found for today');
            // might happen if feature was never used?
            return EMPTY;
          }

          const missingTaskIds = getAllMissingPlannedTaskIdsForDay(
            plannerDay,
            todayTaskIds,
          );

          if (missingTaskIds.length > 0) {
            return this._store.select(selectTasksById, { ids: missingTaskIds }).pipe(
              first(),
              exhaustMap((tasks) => {
                // NOTE: some tasks might not be there anymore since we don't do live updates to the planner model
                const existingTasks = tasks.filter((t) => !!t);
                if (existingTasks.length) {
                  return this._matDialog
                    .open(DialogAddPlannedTasksComponent, {
                      data: {
                        missingTasks: existingTasks,
                      },
                    })
                    .afterClosed()
                    .pipe(
                      map(() =>
                        PlannerActions.updatePlannerDialogLastShown({ today: todayStr }),
                      ),
                    );
                } else {
                  console.log(
                    'Some tasks have been missing',
                    existingTasks,
                    missingTaskIds,
                  );
                  return EMPTY;
                }
              }),
            );
          } else {
            return EMPTY;
          }
        }),
      );
    },
    // { dispatch: false },
  );
}
