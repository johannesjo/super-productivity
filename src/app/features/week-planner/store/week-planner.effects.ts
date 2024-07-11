import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { WeekPlannerActions } from './week-planner.actions';
import { tap, withLatestFrom } from 'rxjs/operators';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { select, Store } from '@ngrx/store';
import { selectWeekPlannerState } from './week-planner.selectors';
import { WeekPlannerState } from './week-planner.reducer';

@Injectable()
export class WeekPlannerEffects {
  saveToDB$ = createEffect(
    () => {
      return this._actions$.pipe(
        ofType(
          WeekPlannerActions.upsertWeekPlannerDay,
          WeekPlannerActions.moveInList,
          WeekPlannerActions.transferTask,
        ),
        withLatestFrom(this._store.pipe(select(selectWeekPlannerState))),
        tap(([, weekPlannerState]) => this._saveToLs(weekPlannerState, true)),
      );
    },
    { dispatch: false },
  );

  // loadWeekPlanners$ = createEffect(() => {
  //   return this.actions$.pipe(
  //
  //     ofType(WeekPlannerActions.loadWeekPlanners),
  //     concatMap(() =>
  //       /** An EMPTY observable only emits completion. Replace with your own observable API request */
  //       EMPTY.pipe(
  //         map(data => WeekPlannerActions.loadWeekPlannersSuccess({ data })),
  //         catchError(error => of(WeekPlannerActions.loadWeekPlannersFailure({ error }))))
  //     )
  //   );
  // });

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
