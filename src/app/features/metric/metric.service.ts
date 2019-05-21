import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { initialMetricState, } from './store/metric.reducer';
import { AddMetric, DeleteMetric, LoadMetricState, UpdateMetric, UpsertMetric } from './store/metric.actions';
import { Observable } from 'rxjs';
import { LineChartData, Metric, MetricState, PieChartData } from './metric.model';
import { PersistenceService } from '../../core/persistence/persistence.service';
import { getWorklogStr } from '../../util/get-work-log-str';
import {
  selectAllMetrics,
  selectImprovementCountsPieChartData,
  selectLastTrackedMetric,
  selectMetricById,
  selectMetricHasData,
  selectObstructionCountsPieChartData,
  selectProductivityHappinessLineChartData,
  selectProductivityHappinessLineChartDataComplete
} from './store/metric.selectors';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class MetricService {
  metrics$: Observable<Metric[]> = this._store$.pipe(select(selectAllMetrics));
  hasData$: Observable<boolean> = this._store$.pipe(select(selectMetricHasData));
  lastTrackedMetric$: Observable<Metric> = this._store$.pipe(select(selectLastTrackedMetric));
  improvementCountsPieChartData$: Observable<PieChartData> = this._store$.pipe(select(selectImprovementCountsPieChartData));
  obstructionCountsPieChartData$: Observable<PieChartData> = this._store$.pipe(select(selectObstructionCountsPieChartData));
  productivityHappinessLineChartData$: Observable<LineChartData> = this._store$.pipe(select(selectProductivityHappinessLineChartDataComplete));

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
    // const improvements = ["rS2wIaPDT", "6_FsrMPU_", "UdeHPW4Q5", "Sv0GOG7tb"];
    // const obstructions = ["fF-ylX-4t", "_m1uJ98oM", "I63Nu5-cE"];
    //
    // setTimeout(() => {
    //   for (let i = 0; i < 50; i++) {
    //     console.log(...(rndRange(5, 0)));
    //
    //     const metric: Metric = {
    //       id: `${rnd(2020, 1989)}/${rnd(10, 12)}/${rnd(10, 28)}`,
    //       improvements: improvements.slice(...(rndRange(improvements.length, 0))),
    //       obstructions: obstructions.slice(...(rndRange(obstructions.length, 0))),
    //       improvementsTomorrow: improvements.slice(...(rndRange(improvements.length, 0))),
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
    const id = getWorklogStr();
    return this._store$.pipe(select(selectMetricById, {id}));
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

  // STATISTICS
  getProductivityHappinessChartData$(howMany = 20): Observable<LineChartData> {
    return this._store$.pipe(select(selectProductivityHappinessLineChartData, {howMany}));
  }
}
