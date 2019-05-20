import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {mapTo, tap, withLatestFrom} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {MetricActionTypes} from './metric.actions';
import {selectCurrentProjectId} from '../../project/store/project.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {selectMetricFeatureState} from './metric.selectors';
import {SnackOpen} from '../../../core/snack/store/snack.actions';

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
      withLatestFrom(
        this._store$.pipe(select(selectCurrentProjectId)),
        this._store$.pipe(select(selectMetricFeatureState)),
      ),
      tap(this._saveToLs.bind(this))
    );

  @Effect() saveMetrics$: any = this._actions$
    .pipe(
      ofType(
        MetricActionTypes.AddMetric,
        MetricActionTypes.UpsertMetric,
        MetricActionTypes.UpdateMetric,
      ),
      mapTo(new SnackOpen({
        type: 'SUCCESS',
        msg: 'Metric successfully saved'
      })),
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
