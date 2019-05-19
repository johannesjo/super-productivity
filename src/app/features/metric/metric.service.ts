import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {initialMetricState,} from './store/metric.reducer';
import {AddMetric, DeleteMetric, LoadMetricState, UpdateMetric, UpsertMetric} from './store/metric.actions';
import {Observable} from 'rxjs';
import {LineChartData, Metric, MetricState, PieChartData} from './metric.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {getWorklogStr} from '../../util/get-work-log-str';
import {
  selectAllMetrics,
  selectImprovementCountsPieChartData,
  selectLastTrackedMetric,
  selectMetricById,
  selectObstructionCountsPieChartData,
  selectProductivityHappinessLineChartData
} from './store/metric.selectors';
import {take} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class MetricService {
  metrics$: Observable<Metric[]> = this._store$.pipe(select(selectAllMetrics));
  lastTrackedMetric$: Observable<Metric> = this._store$.pipe(select(selectLastTrackedMetric));
  improvementCountsPieChartData$: Observable<PieChartData> = this._store$.pipe(select(selectImprovementCountsPieChartData));
  obstructionCountsPieChartData$: Observable<PieChartData> = this._store$.pipe(select(selectObstructionCountsPieChartData));
  productivityHappinessLineChartData$: Observable<LineChartData> = this._store$.pipe(select(selectProductivityHappinessLineChartData));

  constructor(
    private _store$: Store<MetricState>,
    private _persistenceService: PersistenceService,
  ) {
    // // ADD RANDOM STUFF
    // const rnd = (max = 10, min = 0) => Math.floor(Math.random() * (max - min) + min);
    // const rndRange = (max = 10, min = 0): [number, number] => {
    //   const start = rnd(max, min);
    //   return [start, rnd(max, start)];
    // };
    // const improvements = ['KKUFSANZn', 'XB5EobD64', 'nCIm6DC8c', '9H9OKF_Sv', 'vARlS3W0Z'];
    // const obstructions = ['WkVwJhU0r', 'jiPdzVb_w', 'bNl7-0qnK', 'tayOw78q1', 'dWhY0749q'];
    //
    // setTimeout(() => {
    //   for (let i = 0; i < 50; i++) {
    //     console.log(...(rndRange(5, 0)));
    //
    //     const metric: Metric = {
    //       id: `${rnd(2020, 1989)}/${rnd(10, 12)}/${rnd(10, 28)}`,
    //       improvements: improvements.slice(...(rndRange(5, 0))),
    //       obstructions: obstructions.slice(...(rndRange(5, 0))),
    //       improvementsTomorrow: improvements.slice(...(rndRange(5, 0))),
    //       productivity: rnd(10, 1),
    //       mood: rnd(10, 1),
    //     };
    //     console.log(metric);
    //     this._store$.dispatch(new UpsertMetric({
    //       metric
    //     }));
    //   }
    // }, 300);
  }

  async loadStateForProject(projectId: string) {
    const lsMetricState = await this._persistenceService.metric.load(projectId);
    this.loadState(lsMetricState || initialMetricState);
  }

  loadState(state: MetricState) {
    this._store$.dispatch(new LoadMetricState({state}));
  }

  getMetricById(id: string): Observable<Metric> {
    return this._store$.pipe(select(selectMetricById, {id}), take(1));
  }

  getTodaysMetric(): Observable<Metric> {
    return this.getMetricById(getWorklogStr());
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
