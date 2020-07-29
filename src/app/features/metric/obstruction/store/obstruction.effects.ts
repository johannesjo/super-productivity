import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { first, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { DeleteObstructions, ObstructionActionTypes } from './obstruction.actions';
import { selectObstructionFeatureState } from './obstruction.reducer';
import { PersistenceService } from '../../../../core/persistence/persistence.service';
import { MetricActionTypes } from '../../store/metric.actions';
import { selectUnusedObstructionIds } from '../../store/metric.selectors';
import { WorkContextService } from '../../../work-context/work-context.service';
import { combineLatest } from 'rxjs';
import { ObstructionState } from '../obstruction.model';

@Injectable()
export class ObstructionEffects {

  @Effect({dispatch: false}) updateObstructions$: any = this._actions$
    .pipe(
      ofType(
        ObstructionActionTypes.AddObstruction,
        ObstructionActionTypes.UpdateObstruction,
        ObstructionActionTypes.DeleteObstruction,
      ),
      switchMap(() => combineLatest([
        this._workContextService.activeWorkContextIdIfProject$,
        this._store$.pipe(select(selectObstructionFeatureState)),
      ]).pipe(first())),
      tap(([projectId, state]) => this._saveToLs(projectId, state)),
    );

  @Effect() clearUnusedObstructions$: any = this._actions$
    .pipe(
      ofType(
        MetricActionTypes.AddMetric,
        MetricActionTypes.UpsertMetric,
        MetricActionTypes.UpdateMetric,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectUnusedObstructionIds)),
      ),
      map(([a, unusedIds]) => new DeleteObstructions({ids: unusedIds})),
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _workContextService: WorkContextService,
  ) {
  }

  private _saveToLs(currentProjectId: string, obstructionState: ObstructionState) {
    if (currentProjectId) {
      this._persistenceService.obstruction.save(currentProjectId, obstructionState, {isSyncModelChange: true});
    } else {
      throw new Error('No current project id');
    }
  }
}
