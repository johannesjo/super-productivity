import { createFeatureSelector, createSelector } from '@ngrx/store';
import { LineChartData, Metric, MetricState, PieChartData } from '../metric.model';
import { sortWorklogDates } from '../../../util/sortWorklogDates';
import { METRIC_FEATURE_NAME, metricAdapter } from './metric.reducer';
import {
  selectAllImprovementIds,
  selectImprovementFeatureState,
  selectRepeatedImprovementIds,
} from '../improvement/store/improvement.reducer';
import { Improvement, ImprovementState } from '../improvement/improvement.model';
import {
  selectAllObstructionIds,
  selectObstructionFeatureState,
} from '../obstruction/store/obstruction.reducer';
import { ObstructionState } from '../obstruction/obstruction.model';
import { unique } from '../../../util/unique';
import { Log } from '../../../core/log';
import {
  selectAllSimpleCounters,
  selectSimpleCounterFeatureState,
} from '../../simple-counter/store/simple-counter.reducer';
import {
  SimpleCounter,
  SimpleCounterState,
  SimpleCounterType,
} from '../../simple-counter/simple-counter.model';

export const selectMetricFeatureState =
  createFeatureSelector<MetricState>(METRIC_FEATURE_NAME);
export const { selectIds, selectEntities, selectAll, selectTotal } =
  metricAdapter.getSelectors();
export const selectAllMetrics = createSelector(selectMetricFeatureState, selectAll);
export const selectLastTrackedMetric = createSelector(
  selectMetricFeatureState,
  (state: MetricState): Metric | null => {
    const ids = state.ids as string[];
    const sorted = sortWorklogDates(ids);
    const id = sorted[sorted.length - 1];
    return state.entities[id] || null;
  },
);

export const selectMetricHasData = createSelector(
  selectMetricFeatureState,
  (state) => state && !!state.ids.length,
);

export const selectImprovementBannerImprovements = createSelector(
  selectLastTrackedMetric,
  selectImprovementFeatureState,
  selectRepeatedImprovementIds,
  (
    metric: Metric | null,
    improvementState: ImprovementState,
    repeatedImprovementIds: string[],
  ): Improvement[] | null => {
    if (!improvementState.ids.length) {
      return null;
    }
    const hiddenIds = improvementState.hiddenImprovementBannerItems || [];

    const selectedTomorrowIds = (metric && metric.improvementsTomorrow) || [];
    const all = unique(repeatedImprovementIds.concat(selectedTomorrowIds)).filter(
      (id: string) => !hiddenIds.includes(id),
    );
    return (
      all
        .map((id: string) => improvementState.entities[id] as Improvement)
        // NOTE: we need to check, because metric and improvement state might be out of sync for some milliseconds
        // @see #978
        .filter((improvement) => !!improvement)
    );
  },
);

export const selectHasLastTrackedImprovements = createSelector(
  selectImprovementBannerImprovements,
  (improvements): boolean => !!improvements && improvements.length > 0,
);

export const selectAllUsedImprovementIds = createSelector(
  selectAllMetrics,
  (metrics: Metric[]): string[] => {
    return unique(
      metrics.reduce(
        (acc: string[], metric: Metric): string[] => [
          ...acc,
          ...metric.improvements,
          ...metric.improvementsTomorrow,
        ],
        [],
      ),
    );
  },
);

export const selectUnusedImprovementIds = createSelector(
  selectAllUsedImprovementIds,
  selectAllImprovementIds,
  (usedIds: string[], allIds: string[] | number[]): string[] => {
    return (allIds as string[]).filter((id) => !usedIds.includes(id));
  },
);

export const selectAllUsedObstructionIds = createSelector(
  selectAllMetrics,
  (metrics: Metric[]): string[] => {
    return unique(
      metrics.reduce(
        (acc: string[], metric: Metric): string[] => [...acc, ...metric.obstructions],
        [],
      ),
    );
  },
);

export const selectUnusedObstructionIds = createSelector(
  selectAllUsedObstructionIds,
  selectAllObstructionIds,
  (usedIds: string[], allIds: string[] | number[]): string[] => {
    return (allIds as string[]).filter((id) => !usedIds.includes(id));
  },
);

// DYNAMIC
// -------
export const selectMetricById = createSelector(
  selectMetricFeatureState,
  (state: MetricState, props: { id: string }): Metric | null => {
    // if (!state.entities[props.id]) {
    //   throw new Error('Metric not found');
    // }
    return state.entities[props.id] || null;
  },
);

// STATISTICS
// ...
export const selectImprovementCountsPieChartData = createSelector(
  selectAllMetrics,
  selectImprovementFeatureState,
  (metrics: Metric[], improvementState: ImprovementState): PieChartData | null => {
    if (!metrics.length || !improvementState.ids.length) {
      return null;
    }

    const counts: { [key: string]: number } = {};
    metrics.forEach((metric: Metric) => {
      metric.improvements.forEach((improvementId: string) => {
        counts[improvementId] = counts[improvementId] ? counts[improvementId] + 1 : 1;
      });
    });
    const chart: PieChartData = {
      labels: [],
      datasets: [{ data: [] }],
    };
    Object.keys(counts).forEach((id) => {
      const imp = improvementState.entities[id];
      if (imp) {
        chart.labels?.push(imp.title);
        chart.datasets[0].data.push(counts[id]);
      } else {
        Log.err('No improvement entity found');
      }
    });
    return chart;
  },
);

export const selectObstructionCountsPieChartData = createSelector(
  selectAllMetrics,
  selectObstructionFeatureState,
  (metrics: Metric[], obstructionState: ObstructionState): PieChartData | null => {
    if (!metrics.length || !obstructionState.ids.length) {
      return null;
    }

    const counts: { [key: string]: number } = {};
    metrics.forEach((metric: Metric) => {
      metric.obstructions.forEach((obstructionId: string) => {
        counts[obstructionId] = counts[obstructionId] ? counts[obstructionId] + 1 : 1;
      });
    });
    const chart: PieChartData = {
      labels: [],
      datasets: [{ data: [] }],
    };
    Object.keys(counts).forEach((id) => {
      const obstr = obstructionState.entities[id];
      if (obstr) {
        chart.labels?.push(obstr.title);
        chart.datasets[0].data.push(counts[id]);
      } else {
        Log.err('No obstruction entity found');
      }
    });
    return chart;
  },
);

export const selectProductivityHappinessLineChartDataComplete = createSelector(
  selectMetricFeatureState,
  (state: MetricState): LineChartData => {
    const ids = state.ids as string[];
    const sorted = sortWorklogDates(ids);
    const v: LineChartData = {
      labels: [],
      datasets: [
        { data: [], label: 'Mood' },
        { data: [], label: 'Productivity' },
      ],
    };
    sorted.forEach((id) => {
      const metric = state.entities[id] as Metric;
      v.labels?.push(metric.id);
      v.datasets[0].data.push(metric.mood ? metric.mood - 5 : undefined);
      v.datasets[1].data.push(metric.productivity ? metric.productivity - 5 : undefined);
    });
    return v;
  },
);

export const selectProductivityHappinessLineChartData = createSelector(
  selectProductivityHappinessLineChartDataComplete,
  (chart: LineChartData, props: { howMany: number }): LineChartData => {
    const f = -1 * props.howMany;
    return {
      labels: chart.labels?.slice(f),
      datasets: [
        { data: chart.datasets[0].data.slice(f), label: chart.datasets[0].label },
        { data: chart.datasets[1].data.slice(f), label: chart.datasets[1].label },
      ],
    };
  },
);

export const selectSimpleCounterClickCounterLineChartData = createSelector(
  selectSimpleCounterFeatureState,
  (simpleCounterState: SimpleCounterState, props: { howMany: number }): LineChartData => {
    // NOTE: for the most weird reasons that fixes the problem with the page refreshing on every single action ???
    // it doesn't matter if I use the alternative approach here or below for selectSimpleCounterStopWatchLineChartData
    // just having this here fixes the issue for both and vice versa
    const simpleCounterItems: SimpleCounter[] = Object.values(
      simpleCounterState.entities,
    ) as SimpleCounter[];

    const f = -1 * props.howMany;
    const chart: LineChartData = {
      labels: [],
      datasets: [{ data: [] }],
    };
    const stopwatchItems = simpleCounterItems.filter(
      (item) => item.type === SimpleCounterType.ClickCounter,
    );
    let allDays: string[] = [];
    stopwatchItems.forEach((item, i) => {
      allDays = allDays.concat(Object.keys(item.countOnDay));
    });
    const allDaysSorted = sortWorklogDates(unique(allDays)).slice(f);
    chart.labels = allDaysSorted;

    stopwatchItems.forEach((item, j) => {
      chart.datasets[j] = { data: [], label: item.title };
      allDaysSorted.forEach((day) => {
        const valueForDay = item.countOnDay[day];
        chart.datasets[j].data.push(valueForDay ? valueForDay : undefined);
      });
    });
    return chart;
  },
);

export const selectSimpleCounterStopWatchLineChartData = createSelector(
  selectAllSimpleCounters,
  (simpleCounterItems: SimpleCounter[], props: { howMany: number }): LineChartData => {
    const f = -1 * props.howMany;
    const chart: LineChartData = {
      labels: [],
      datasets: [{ data: [] }],
    };
    const stopwatchItems = simpleCounterItems.filter(
      (item) => item.type === SimpleCounterType.StopWatch,
    );
    let allDays: string[] = [];
    stopwatchItems.forEach((item, i) => {
      allDays = allDays.concat(Object.keys(item.countOnDay));
    });
    const allDaysSorted = sortWorklogDates(unique(allDays)).slice(f);
    chart.labels = allDaysSorted;

    stopwatchItems.forEach((item, j) => {
      chart.datasets[j] = { data: [], label: item.title };
      allDaysSorted.forEach((day) => {
        const valueForDay = item.countOnDay[day];
        chart.datasets[j].data.push(
          valueForDay ? Math.round(valueForDay / 60000) : undefined,
        );
      });
    });
    return chart;
  },
);
