import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PlannerActions } from './planner.actions';
import {
  exhaustMap,
  filter,
  first,
  skip,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { selectPlannerState } from './planner.selectors';
import { PlannerState } from './planner.reducer';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { scheduleTask, updateTaskTags } from '../../tasks/store/task.actions';
import { EMPTY, merge, of } from 'rxjs';
import { TODAY_TAG } from '../../tag/tag.const';
import { unique } from '../../../util/unique';
import { selectTodayTaskIds } from '../../work-context/store/work-context.selectors';
import { MatDialog } from '@angular/material/dialog';
import { DialogAddPlannedTasksComponent } from '../dialog-add-planned-tasks/dialog-add-planned-tasks.component';
import { selectTasksById } from '../../tasks/store/task.selectors';
import { SyncTriggerService } from '../../../imex/sync/sync-trigger.service';
import { GlobalTrackingIntervalService } from '../../../core/global-tracking-interval/global-tracking-interval.service';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';

@Injectable()
export class PlannerEffects {
  saveToDB$ = createEffect(
    () => {
      return this._store.pipe(
        select(selectPlannerState),
        skip(1),
        tap((plannerState) => this._saveToLs(plannerState, true)),
      );
    },
    { dispatch: false },
  );

  addOrRemoveTodayTag$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(PlannerActions.transferTask),
      switchMap(({ prevDay, newDay, task }) => {
        const todayDayStr = getWorklogStr();
        if (prevDay === todayDayStr && newDay !== todayDayStr) {
          const newTagIds = task.tagIds.filter((tagId) => tagId !== TODAY_TAG.id);
          // NOTE: we need to prevent the NO tag NO project case
          if (newTagIds.length > 0 || task.projectId) {
            return of(
              updateTaskTags({
                task,
                oldTagIds: task.tagIds,
                newTagIds,
              }),
            );
          }
        }
        if (prevDay !== todayDayStr && newDay === todayDayStr) {
          return of(
            updateTaskTags({
              task,
              oldTagIds: task.tagIds,
              newTagIds: unique([TODAY_TAG.id, ...task.tagIds]),
            }),
          );
        }
        return EMPTY;
      }),
    );
  });

  removeOnSchedule$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(scheduleTask),
      filter((action) => !!action.plannedAt),
      switchMap(({ task }) => {
        return of(
          PlannerActions.removeTaskFromDays({
            taskId: task.id,
          }),
        );
      }),
    );
  });

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
            this._globalTrackingIntervalService.todayDateStr$,
          );
        }),
        withLatestFrom(
          this._store.pipe(select(selectPlannerState)),
          this._store.pipe(select(selectTodayTaskIds)),
        ),
        exhaustMap(([todayStr, plannerState, todayTaskIds]) => {
          const plannedTodayTaskIds = plannerState.days[todayStr] || [];
          const missingTasks = plannedTodayTaskIds.filter(
            (tid) => !todayTaskIds.includes(tid),
          );
          if (missingTasks.length > 0) {
            return this._store.select(selectTasksById, { ids: missingTasks }).pipe(
              first(),
              exhaustMap((tasks) => {
                return this._matDialog
                  .open(DialogAddPlannedTasksComponent, {
                    data: {
                      missingTasks: tasks,
                    },
                  })
                  .afterClosed();
              }),
            );
          } else {
            return EMPTY;
          }
        }),
      );
    },
    { dispatch: false },
  );

  constructor(
    private _actions$: Actions,
    private _store: Store,
    private _persistenceService: PersistenceService,
    private _syncTriggerService: SyncTriggerService,
    private _matDialog: MatDialog,
    private _globalTrackingIntervalService: GlobalTrackingIntervalService,
  ) {}

  private _saveToLs(
    plannerState: PlannerState,
    isSyncModelChange: boolean = false,
  ): void {
    this._persistenceService.planner.saveState(plannerState, {
      isSyncModelChange,
    });
  }
}
