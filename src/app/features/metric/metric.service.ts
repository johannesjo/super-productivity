import { Injectable, inject } from '@angular/core';
import { select, Store } from '@ngrx/store';
import {
  addMetric,
  deleteMetric,
  updateMetric,
  upsertMetric,
} from './store/metric.actions';
import { combineLatest, Observable, of } from 'rxjs';
import { LineChartData, Metric, MetricState, PieChartData } from './metric.model';
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
import { DateService } from 'src/app/core/date/date.service';

@Injectable({
  providedIn: 'root',
})
export class MetricService {
  private _store$ = inject<Store<MetricState>>(Store);
  private _dateService = inject(DateService);

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

  // getMetricForDay$(id: string = getWorklogStr()): Observable<Metric> {
  //   if (!id) {
  //     throw new Error('No valid id provided');
  //   }
  //   return this._store$.pipe(select(selectMetricById, {id}), take(1));
  // }

  getMetricForDayOrDefaultWithCheckedImprovements$(
    day: string = this._dateService.todayStr(),
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
          id: metric.id || this._dateService.todayStr(),
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
    const day = this._dateService.todayStr();
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
