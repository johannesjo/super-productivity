import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { tap, withLatestFrom } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { ObstructionActionTypes } from './obstruction.actions';
import { selectObstructionFeatureState } from './obstruction.reducer';
import { PersistenceService } from '../../../../core/persistence/persistence.service';
import { selectCurrentProjectId } from '../../../project/store/project.reducer';

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
        this._store$.pipe(select(selectCurrentProjectId)),
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

  private _saveToLs([action, currentProjectId, obstructionState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.obstruction.save(currentProjectId, obstructionState);
    } else {
      throw new Error('No current project id');
    }
  }
}
