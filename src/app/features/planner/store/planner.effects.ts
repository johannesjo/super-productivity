import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PlannerActions } from './planner.actions';
import { filter, skip, switchMap, tap } from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { selectPlannerState } from './planner.selectors';
import { PlannerState } from './planner.reducer';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { scheduleTask, updateTaskTags } from '../../tasks/store/task.actions';
import { EMPTY, of } from 'rxjs';
import { TODAY_TAG } from '../../tag/tag.const';
import { unique } from '../../../util/unique';

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

  constructor(
    private _actions$: Actions,
    private _store: Store,
    private _persistenceService: PersistenceService,
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
