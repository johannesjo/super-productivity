import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {MetricActionTypes} from './metric.actions';
import {selectMetricFeatureState} from './metric.reducer';
import {selectCurrentProjectId} from '../../project/store/project.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';

@Injectable()
export class MetricEffects {

  @Effect({dispatch: false}) updateMetrics$: any = this._actions$
    .pipe(
      ofType(
        MetricActionTypes.AddMetric,
        MetricActionTypes.UpdateMetric,
        MetricActionTypes.DeleteMetric,
      ),
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectMetricFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService
  ) {
  }

  private _saveToLs([action, currentProjectId, metricState]) {
    if (currentProjectId) {
      this._persistenceService.saveLastActive();
      this._persistenceService.metric.save(currentProjectId, metricState);
    } else {
      throw new Error('No current project id');
    }
  }

}
