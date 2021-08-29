import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import {
  addMetric,
  deleteMetric,
  updateMetric,
  upsertMetric,
} from './store/metric.actions';
import { combineLatest, Observable, of } from 'rxjs';
import { LineChartData, Metric, MetricState, PieChartData } from './metric.model';
import { getWorklogStr } from '../../util/get-work-log-str';
import {
  selectImprovementCountsPieChartData,
  selectMetricById,
  selectMetricFeatureState,
  selectMetricHasData,
  selectObstructionCountsPieChartData,
  selectProductivityHappinessLineChartData,
  selectSimpleCounterClickCounterLineChartData,
  selectSimpleCounterStopWatchLineChartData,
} from './store/metric.selectors';
import { map, switchMap } from 'rxjs/operators';
import { DEFAULT_METRIC_FOR_DAY } from './metric.const';
import {
  selectCheckedImprovementIdsForDay,
  selectRepeatedImprovementIds,
} from './improvement/store/improvement.reducer';
import { selectHasSimpleCounterData } from '../simple-counter/store/simple-counter.reducer';

@Injectable({
  providedIn: 'root',
})
export class MetricService {
  // metrics$: Observable<Metric[]> = this._store$.pipe(select(selectAllMetrics));
  hasData$: Observable<boolean> = this._store$.pipe(select(selectMetricHasData));
  hasSimpleCounterData$: Observable<boolean> = this._store$.pipe(
    select(selectHasSimpleCounterData),
  );
  state$: Observable<MetricState> = this._store$.pipe(select(selectMetricFeatureState));
  // lastTrackedMetric$: Observable<Metric> = this._store$.pipe(select(selectLastTrackedMetric));
  improvementCountsPieChartData$: Observable<PieChartData | null> = this._store$.pipe(
    select(selectImprovementCountsPieChartData),
  );
  obstructionCountsPieChartData$: Observable<PieChartData | null> = this._store$.pipe(
    select(selectObstructionCountsPieChartData),
  );

  // productivityHappinessLineChartData$: Observable<LineChartData> = this._store$.pipe(select(selectProductivityHappinessLineChartDataComplete));

  constructor(private _store$: Store<MetricState>) {}

  // getMetricForDay$(id: string = getWorklogStr()): Observable<Metric> {
  //   if (!id) {
  //     throw new Error('No valid id provided');
  //   }
  //   return this._store$.pipe(select(selectMetricById, {id}), take(1));
  // }

  getMetricForDayOrDefaultWithCheckedImprovements$(
    day: string = getWorklogStr(),
  ): Observable<Metric> {
    return this._store$.pipe(select(selectMetricById, { id: day })).pipe(
      switchMap((metric) => {
        return metric
          ? of(metric)
          : combineLatest([
              this._store$.pipe(select(selectCheckedImprovementIdsForDay, { day })),
              this._store$.pipe(select(selectRepeatedImprovementIds)),
            ]).pipe(
              map(([checkedImprovementIds, repeatedImprovementIds]) => {
                return {
                  id: day,
                  ...DEFAULT_METRIC_FOR_DAY,
                  improvements: checkedImprovementIds || [],
                  improvementsTomorrow: repeatedImprovementIds || [],
                };
              }),
            );
      }),
    );
  }

  addMetric(metric: Metric): void {
    this._store$.dispatch(
      addMetric({
        metric: {
          ...metric,
          id: metric.id || getWorklogStr(),
        },
      }),
    );
  }

  deleteMetric(id: string): void {
    this._store$.dispatch(deleteMetric({ id }));
  }

  updateMetric(id: string, changes: Partial<Metric>): void {
    this._store$.dispatch(updateMetric({ metric: { id, changes } }));
  }

  upsertMetric(metric: Metric): void {
    this._store$.dispatch(upsertMetric({ metric }));
  }

  upsertTodayMetric(metricIn: Partial<Metric>): void {
    const day = getWorklogStr();
    const metric = {
      id: day,
      ...DEFAULT_METRIC_FOR_DAY,
      ...metricIn,
    } as Metric;
    this._store$.dispatch(upsertMetric({ metric }));
  }

  // STATISTICS
  getProductivityHappinessChartData$(howMany: number = 60): Observable<LineChartData> {
    return this._store$.select(selectProductivityHappinessLineChartData, { howMany });
  }

  getSimpleClickCounterMetrics$(howMany: number = 60): Observable<LineChartData> {
    return this._store$.select(selectSimpleCounterClickCounterLineChartData, { howMany });
  }

  getSimpleCounterStopwatchMetrics$(howMany: number = 60): Observable<LineChartData> {
    return this._store$.select(selectSimpleCounterStopWatchLineChartData, { howMany });
  }
}
