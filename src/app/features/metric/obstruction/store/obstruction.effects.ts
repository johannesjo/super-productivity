import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { first, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import {
  addObstruction,
  deleteObstruction,
  deleteObstructions,
  updateObstruction,
} from './obstruction.actions';
import { selectObstructionFeatureState } from './obstruction.reducer';
import { PersistenceService } from '../../../../core/persistence/persistence.service';
import { addMetric, updateMetric, upsertMetric } from '../../store/metric.actions';
import { ObstructionState } from '../obstruction.model';
import { selectUnusedObstructionIds } from '../../store/metric.selectors';

@Injectable()
export class ObstructionEffects {
  updateObstructions$: any = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addObstruction, updateObstruction, deleteObstruction),
        switchMap(() =>
          this._store$.pipe(select(selectObstructionFeatureState)).pipe(first()),
        ),
        tap((state) => this._saveToLs(state)),
      ),
    { dispatch: false },
  );

  clearUnusedObstructions$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(addMetric, upsertMetric, updateMetric),
      withLatestFrom(this._store$.pipe(select(selectUnusedObstructionIds))),
      map(([a, unusedIds]) => deleteObstructions({ ids: unusedIds })),
    ),
  );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
  ) {}

  private _saveToLs(obstructionState: ObstructionState): void {
    this._persistenceService.obstruction.saveState(obstructionState, {
      isSyncModelChange: true,
    });
  }
}
