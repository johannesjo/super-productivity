import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {initialMetricState,} from './store/metric.reducer';
import {AddMetric, DeleteMetric, LoadMetricState, UpdateMetric, UpsertMetric} from './store/metric.actions';
import {Observable} from 'rxjs';
import {Metric, MetricState, PieChartData} from './metric.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {getWorklogStr} from '../../util/get-work-log-str';
import {
  selectAllMetrics,
  selectImprovementCountsPieChartData,
  selectLastTrackedMetric,
  selectMetricFeatureState, selectObstructionCountsPieChartData
} from './store/metric.selectors';

@Injectable({
  providedIn: 'root',
})
export class MetricService {
  metrics$: Observable<Metric[]> = this._store$.pipe(select(selectAllMetrics));
  lastTrackedMetric$: Observable<Metric> = this._store$.pipe(select(selectLastTrackedMetric));
  improvementCountsPieChartData$: Observable<PieChartData> = this._store$.pipe(select(selectImprovementCountsPieChartData));
  obstructionCountsPieChartData$: Observable<PieChartData> = this._store$.pipe(select(selectObstructionCountsPieChartData));

  constructor(
    private _store$: Store<MetricState>,
    private _persistenceService: PersistenceService,
  ) {
  }

  async loadStateForProject(projectId: string) {
    const lsMetricState = await this._persistenceService.metric.load(projectId);
    this.loadState(lsMetricState || initialMetricState);
  }

  loadState(state: MetricState) {
    this._store$.dispatch(new LoadMetricState({state}));
  }

  addMetric(metric: Metric) {
    this._store$.dispatch(new AddMetric({
      metric: {
        ...metric,
        id: getWorklogStr()
      }
    }));
  }

  deleteMetric(id: string) {
    this._store$.dispatch(new DeleteMetric({id}));
  }

  updateMetric(id: string, changes: Partial<Metric>) {
    this._store$.dispatch(new UpdateMetric({metric: {id, changes}}));
  }

  upsertMetric(metric: Metric) {
    this._store$.dispatch(new UpsertMetric({metric}));
  }
}
