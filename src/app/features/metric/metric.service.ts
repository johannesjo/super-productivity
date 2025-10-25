import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { select, Store } from '@ngrx/store';
import {
  addMetric,
  deleteMetric,
  updateMetric,
  upsertMetric,
  logFocusSession,
} from './store/metric.actions';
import { combineLatest, Observable, of } from 'rxjs';
import { LineChartData, Metric, MetricState } from './metric.model';
import {
  selectImprovementCountsPieChartData,
  selectMetricById,
  selectMetricHasData,
  selectObstructionCountsPieChartData,
  selectFocusSessionLineChartData,
  selectFocusSessionsByDay,
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
import { DateService } from 'src/app/core/date/date.service';

const MIN_FOCUS_SESSION_DURATION = 1000;

@Injectable({
  providedIn: 'root',
})
export class MetricService {
  private _store$ = inject<Store<MetricState>>(Store);
  private _dateService = inject(DateService);

  hasData = toSignal(this._store$.pipe(select(selectMetricHasData)), {
    initialValue: false,
  });
  improvementCountsPieChartData = toSignal(
    this._store$.pipe(select(selectImprovementCountsPieChartData)),
    { initialValue: null },
  );

  obstructionCountsPieChartData = toSignal(
    this._store$.pipe(select(selectObstructionCountsPieChartData)),
    { initialValue: null },
  );

  focusSessionsByDay = toSignal(this._store$.pipe(select(selectFocusSessionsByDay)), {
    initialValue: {} as Record<string, { count: number; total: number }>,
  });

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
          ? of({
              ...metric,
              focusSessions: metric.focusSessions ?? [],
            })
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
                  focusSessions: [],
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

  logFocusSession(duration: number, day: string = this._dateService.todayStr()): void {
    if (!duration || duration < MIN_FOCUS_SESSION_DURATION) {
      return;
    }

    this._store$.dispatch(
      logFocusSession({
        day,
        duration,
      }),
    );
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

  getFocusSessionMetrics$(howMany: number = 60): Observable<LineChartData> {
    return this._store$.select(selectFocusSessionLineChartData, { howMany });
  }

  getFocusSummaryForDay(day: string): { count: number; total: number } | undefined {
    return this.focusSessionsByDay()[day];
  }
}
