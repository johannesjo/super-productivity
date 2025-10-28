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
  selectLastNDaysMetrics,
} from './store/metric.selectors';
import { map, switchMap } from 'rxjs/operators';
import { DEFAULT_METRIC_FOR_DAY } from './metric.const';
import {
  selectCheckedImprovementIdsForDay,
  selectRepeatedImprovementIds,
} from './improvement/store/improvement.reducer';
import { DateService } from 'src/app/core/date/date.service';
import {
  calculateAverageProductivityScore,
  calculateProductivityScore,
  calculateProductivityTrend,
  focusSessionsToMinutes,
  TrendIndicator,
} from './metric-scoring.util';
import { WorklogService } from '../worklog/worklog.service';
import { Worklog } from '../worklog/worklog.model';
import { getTimeSpentForDay } from '../worklog/util/get-time-spent-for-day.util';

const MIN_FOCUS_SESSION_DURATION = 1000;

export interface ProductivityBreakdownItem {
  day: string;
  score: number;
  impactRating: number;
  focusedMinutes: number;
  totalWorkMinutes: number;
}

@Injectable({
  providedIn: 'root',
})
export class MetricService {
  private _store$ = inject<Store<MetricState>>(Store);
  private _dateService = inject(DateService);
  private _worklogService = inject(WorklogService);

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

  private _deriveTotalWorkMinutes(
    worklog: Worklog,
    metric: Metric,
    focusedMinutes: number,
  ): number {
    const timeSpentMs = getTimeSpentForDay(worklog, metric.id);
    if (timeSpentMs !== undefined) {
      return timeSpentMs / (1000 * 60);
    }
    if (metric.totalWorkMinutes != null) {
      return metric.totalWorkMinutes;
    }
    return Math.max(focusedMinutes, 0);
  }

  private _mapToBreakdown(
    metric: Metric,
    worklog: Worklog,
  ): ProductivityBreakdownItem | null {
    const focusSessions = metric.focusSessions ?? [];
    if (!metric.impactOfWork || focusSessions.length === 0) {
      return null;
    }

    const focusedMinutes = focusSessionsToMinutes(focusSessions);
    const totalWorkMinutes = this._deriveTotalWorkMinutes(
      worklog,
      metric,
      focusedMinutes,
    );

    const score = calculateProductivityScore(metric.impactOfWork, focusedMinutes);

    return {
      day: metric.id,
      score,
      impactRating: metric.impactOfWork,
      focusedMinutes,
      totalWorkMinutes,
    };
  }

  /**
   * Gets the average productivity score for the last N days.
   * @param days Number of days to include in average (default 7)
   * @param endDate Optional end date (default today)
   * @returns Observable of average score or null if insufficient data
   */
  getAverageProductivityScore$(
    days: number = 7,
    endDate?: string,
  ): Observable<number | null> {
    return this._store$
      .pipe(select(selectLastNDaysMetrics, { days, endDate }))
      .pipe(map((metrics) => calculateAverageProductivityScore(metrics)));
  }

  /**
   * Gets the productivity trend comparing current period to previous period.
   * @param days Number of days per period (default 7)
   * @param endDate Optional end date (default today)
   * @returns Observable of trend indicator or null if insufficient data
   */
  getProductivityTrend$(
    days: number = 7,
    endDate?: string,
  ): Observable<TrendIndicator | null> {
    return combineLatest([
      this._store$.pipe(select(selectLastNDaysMetrics, { days, endDate })),
      this._store$.pipe(
        select(selectLastNDaysMetrics, {
          days,
          endDate: this._getPreviousPeriodDate(days, endDate),
        }),
      ),
    ]).pipe(
      map(([currentPeriod, previousPeriod]) =>
        calculateProductivityTrend(currentPeriod, previousPeriod),
      ),
    );
  }

  getProductivityBreakdown$(
    days: number = 7,
    endDate?: string,
  ): Observable<ProductivityBreakdownItem[]> {
    return combineLatest([
      this._store$.pipe(select(selectLastNDaysMetrics, { days, endDate })),
      this._worklogService.worklog$,
    ]).pipe(
      map(([metrics, worklog]) => {
        return metrics
          .map((metric) => this._mapToBreakdown(metric, worklog))
          .filter((item): item is ProductivityBreakdownItem => !!item);
      }),
    );
  }

  private _getPreviousPeriodDate(days: number, endDate?: string): string {
    const end = endDate ? new Date(endDate) : new Date();
    // Go back by the number of days to get the end of the previous period
    end.setDate(end.getDate() - days);
    return end.toISOString().split('T')[0];
  }
}
