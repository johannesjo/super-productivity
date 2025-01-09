import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, first, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import {
  addImprovement,
  addImprovementCheckedDay,
  clearHiddenImprovements,
  deleteImprovement,
  deleteImprovements,
  disableImprovementRepeat,
  hideImprovement,
  toggleImprovementRepeat,
  updateImprovement,
} from './improvement.actions';
import {
  selectImprovementFeatureState,
  selectImprovementHideDay,
} from './improvement.reducer';
import { PersistenceService } from '../../../../core/persistence/persistence.service';
import { selectUnusedImprovementIds } from '../../store/metric.selectors';
import { ImprovementState } from '../improvement.model';
import { loadProjectRelatedDataSuccess } from '../../../project/store/project.actions';
import { DateService } from 'src/app/core/date/date.service';

@Injectable()
export class ImprovementEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _persistenceService = inject(PersistenceService);
  private _dateService = inject(DateService);

  updateImprovements$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addImprovement,
          updateImprovement,
          toggleImprovementRepeat,
          disableImprovementRepeat,
          hideImprovement,
          deleteImprovement,
          addImprovementCheckedDay,
        ),
        switchMap(() => this._store$.select(selectImprovementFeatureState).pipe(first())),
        tap((state) => this._saveToLs(state)),
      ),
    { dispatch: false },
  );

  clearImprovements$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(loadProjectRelatedDataSuccess.type),
      withLatestFrom(this._store$.select(selectImprovementHideDay)),
      filter(([, hideDay]) => hideDay !== this._dateService.todayStr()),
      map(() => clearHiddenImprovements()),
    ),
  );

  clearUnusedImprovements$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(loadProjectRelatedDataSuccess.type),
      withLatestFrom(this._store$.select(selectUnusedImprovementIds)),
      map(([a, unusedIds]) => deleteImprovements({ ids: unusedIds })),
    ),
  );

  private _saveToLs(improvementState: ImprovementState): void {
    this._persistenceService.improvement.saveState(improvementState, {
      isSyncModelChange: true,
    });
  }
}
