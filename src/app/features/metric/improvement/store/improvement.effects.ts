import { inject, Injectable } from '@angular/core';
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
import { selectUnusedImprovementIds } from '../../store/metric.selectors';
import { ImprovementState } from '../improvement.model';
import { DateService } from 'src/app/core/date/date.service';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';
import { PfapiService } from '../../../../pfapi/pfapi.service';

@Injectable()
export class ImprovementEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _pfapiService = inject(PfapiService);
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

  // TODO check
  clearImprovements$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(loadAllData.type),
      withLatestFrom(this._store$.select(selectImprovementHideDay)),
      filter(([, hideDay]) => hideDay !== this._dateService.todayStr()),
      map(() => clearHiddenImprovements()),
    ),
  );

  // TODO check
  clearUnusedImprovements$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(loadAllData.type),
      withLatestFrom(this._store$.select(selectUnusedImprovementIds)),
      map(([a, unusedIds]) => deleteImprovements({ ids: unusedIds })),
    ),
  );

  private _saveToLs(improvementState: ImprovementState): void {
    this._pfapiService.m.improvement.save(improvementState, {
      isSyncModelChange: true,
    });
  }
}
