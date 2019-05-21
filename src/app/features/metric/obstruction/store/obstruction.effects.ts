import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { map, tap, withLatestFrom } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { DeleteObstructions, ObstructionActionTypes } from './obstruction.actions';
import { selectObstructionFeatureState } from './obstruction.reducer';
import { PersistenceService } from '../../../../core/persistence/persistence.service';
import { MetricActionTypes } from '../../store/metric.actions';
import { selectUnusedObstructionIds } from '../../store/metric.selectors';

@Injectable()
export class ObstructionEffects {

  @Effect({dispatch: false}) updateObstructions$: any = this._actions$
    .pipe(
      ofType(
        ObstructionActionTypes.AddObstruction,
        ObstructionActionTypes.UpdateObstruction,
        ObstructionActionTypes.DeleteObstruction,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectObstructionFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  // NOTE this doesn't work, because metrics are project lvl and obstructions global lvl
  // @Effect() clearUnusedObstructions$: any = this._actions$
  //   .pipe(
  //     ofType(
  //       MetricActionTypes.AddMetric,
  //       MetricActionTypes.UpsertMetric,
  //       MetricActionTypes.UpdateMetric,
  //     ),
  //     withLatestFrom(
  //       this._store$.pipe(select(selectUnusedObstructionIds)),
  //     ),
  //     map(([a, unusedIds]) => new DeleteObstructions({ids: unusedIds})),
  //   );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, obstructionState]) {
    this._persistenceService.saveLastActive();
    this._persistenceService.obstruction.save(obstructionState);
  }
}
