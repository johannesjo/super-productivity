import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PlannerActions } from './planner.actions';
import { tap, withLatestFrom } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { selectPlannerState } from './planner.selectors';
import { PlannerState } from './planner.reducer';
import { unScheduleTask, updateTaskTags } from '../../tasks/store/task.actions';
import { PfapiService } from '../../../pfapi/pfapi.service';

@Injectable()
export class PlannerEffects {
  private _actions$ = inject(Actions);
  private _store = inject(Store);
  private _pfapiService = inject(PfapiService);

  saveToDB$ = createEffect(
    () => {
      return this._actions$.pipe(
        ofType(
          PlannerActions.updatePlannerDialogLastShown,
          PlannerActions.upsertPlannerDay,
          PlannerActions.cleanupOldAndUndefinedPlannerTasks,
          PlannerActions.moveInList,
          PlannerActions.transferTask,
          PlannerActions.planTaskForDay,
          PlannerActions.moveBeforeTask,
          updateTaskTags,
          unScheduleTask,
        ),
        withLatestFrom(this._store.pipe(select(selectPlannerState))),
        tap(([, plannerState]) => this._saveToLs(plannerState)),
      );
    },
    { dispatch: false },
  );

  private _saveToLs(plannerState: PlannerState): void {
    this._pfapiService.m.planner.save(plannerState, {
      isUpdateRevAndLastUpdate: true,
    });
  }
}
