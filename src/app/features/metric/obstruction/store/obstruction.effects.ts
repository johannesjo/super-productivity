import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, withLatestFrom } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { deleteObstructions } from './obstruction.actions';
import { addMetric, updateMetric, upsertMetric } from '../../store/metric.actions';
import { selectUnusedObstructionIds } from '../../store/metric.selectors';

@Injectable()
export class ObstructionEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);

  clearUnusedObstructions$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(addMetric, upsertMetric, updateMetric),
      withLatestFrom(this._store$.pipe(select(selectUnusedObstructionIds))),
      map(([a, unusedIds]) => deleteObstructions({ ids: unusedIds })),
    ),
  );
}
