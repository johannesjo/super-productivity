import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {initialMetricState, selectAllMetrics,} from './store/metric.reducer';
import {AddMetric, DeleteMetric, LoadMetricState, UpdateMetric} from './store/metric.actions';
import {Observable} from 'rxjs';
import {Metric, MetricState} from './metric.model';
import shortid from 'shortid';
import {PersistenceService} from '../../core/persistence/persistence.service';

@Injectable({
  providedIn: 'root',
})
export class MetricService {
  metrics$: Observable<Metric[]> = this._store$.pipe(select(selectAllMetrics));

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

  // TODO use day
  addMetric(metric: Metric) {
    this._store$.dispatch(new AddMetric({
      metric: {
        ...metric,
        id: shortid()
      }
    }));
  }

  deleteMetric(id: string) {
    this._store$.dispatch(new DeleteMetric({id}));
  }

  updateMetric(id: string, changes: Partial<Metric>) {
    this._store$.dispatch(new UpdateMetric({metric: {id, changes}}));
  }
}
