import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { first, switchMap, tap } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { MetricActionTypes } from './metric.actions';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { selectMetricFeatureState } from './metric.selectors';
import { WorkContextService } from '../../work-context/work-context.service';
import { combineLatest } from 'rxjs';
import { MetricState } from '../metric.model';

@Injectable()
export class MetricEffects {

  @Effect({dispatch: false}) updateMetrics$: any = this._actions$
    .pipe(
      ofType(
        MetricActionTypes.AddMetric,
        MetricActionTypes.UpdateMetric,
        MetricActionTypes.DeleteMetric,
        MetricActionTypes.UpsertMetric,
      ),
      switchMap(() => combineLatest([
        this._workContextService.activeWorkContextIdIfProject$,
        this._store$.pipe(select(selectMetricFeatureState)),
      ]).pipe(first())),
      tap(([projectId, state]) => this._saveToLs(projectId, state)),
    );

  // @Effect({dispatch: false}) saveMetrics$: any = this._actions$
  //   .pipe(
  //     ofType(
  //       MetricActionTypes.AddMetric,
  //       MetricActionTypes.UpsertMetric,
  //       MetricActionTypes.UpdateMetric,
  //     ),
  //     tap(() => this._snackService.open({
  //       type: 'SUCCESS',
  //       msg: T.F.METRIC.S.SAVE_METRIC
  //     })),
  //   );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _workContextService: WorkContextService,
  ) {
  }

  private _saveToLs(currentProjectId: string, metricState: MetricState) {
    if (currentProjectId) {
      this._persistenceService.metric.save(currentProjectId, metricState, {isSyncModelChange: true});
    } else {
      throw new Error('No current project id');
    }
  }

}
