import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, map, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { clearHiddenImprovements, deleteImprovements } from './improvement.actions';
import { selectImprovementHideDay } from './improvement.reducer';
import { selectUnusedImprovementIds } from '../../store/metric.selectors';
import { DateService } from 'src/app/core/date/date.service';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';

@Injectable()
export class ImprovementEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _dateService = inject(DateService);

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
}
