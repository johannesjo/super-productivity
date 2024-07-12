import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { WeekPlannerActions } from './week-planner.actions';
import { skip, switchMap, tap } from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { selectWeekPlannerState } from './week-planner.selectors';
import { WeekPlannerState } from './week-planner.reducer';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { updateTaskTags } from '../../tasks/store/task.actions';
import { EMPTY, of } from 'rxjs';
import { TODAY_TAG } from '../../tag/tag.const';
import { unique } from '../../../util/unique';

@Injectable()
export class WeekPlannerEffects {
  saveToDB$ = createEffect(
    () => {
      return this._store.pipe(
        select(selectWeekPlannerState),
        skip(1),
        tap((weekPlannerState) => this._saveToLs(weekPlannerState, true)),
      );
    },
    { dispatch: false },
  );

  addOrRemoveTodayTag$ = createEffect(() => {
    return this._actions$.pipe(
      ofType(WeekPlannerActions.transferTask),
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

  constructor(
    private _actions$: Actions,
    private _store: Store,
    private _persistenceService: PersistenceService,
  ) {}

  private _saveToLs(
    weekPlannerState: WeekPlannerState,
    isSyncModelChange: boolean = false,
  ): void {
    this._persistenceService.weekPlanner.saveState(weekPlannerState, {
      isSyncModelChange,
    });
  }
}
