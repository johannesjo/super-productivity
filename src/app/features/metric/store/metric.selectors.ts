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
  selectAllImprovementIds as any,
  (usedIds: string[], allIds: string[]): string[] => {
    return allIds.filter((id) => !usedIds.includes(id));
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
  selectAllObstructionIds as any,
  (usedIds: string[], allIds: string[]): string[] => {
    return allIds.filter((id) => !usedIds.includes(id));
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

    const counts: any = {};
    metrics.forEach((metric: Metric) => {
      metric.improvements.forEach((improvementId: string) => {
        counts[improvementId] = counts[improvementId] ? counts[improvementId] + 1 : 1;
      });
    });
    const chart: PieChartData = {
      labels: [],
      data: [],
    };
    Object.keys(counts).forEach((id) => {
      const imp = improvementState.entities[id];
      if (imp) {
        chart.labels.push(imp.title);
        chart.data.push(counts[id]);
      } else {
        console.warn('No improvement entity found');
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

    const counts: any = {};
    metrics.forEach((metric: Metric) => {
      metric.obstructions.forEach((obstructionId: string) => {
        counts[obstructionId] = counts[obstructionId] ? counts[obstructionId] + 1 : 1;
      });
    });
    const chart: PieChartData = {
      labels: [],
      data: [],
    };
    Object.keys(counts).forEach((id) => {
      const obstr = obstructionState.entities[id];
      if (obstr) {
        chart.labels.push(obstr.title);
        chart.data.push(counts[id]);
      } else {
        console.warn('No obstruction entity found');
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

    const v: any = {
      labels: [],
      data: [
        { data: [], label: 'Mood' },
        { data: [], label: 'Productivity' },
      ],
    };
    sorted.forEach((id) => {
      const metric = state.entities[id] as Metric;
      v.labels.push(metric.id);
      v.data[0].data.push(metric.mood);
      v.data[1].data.push(metric.productivity);
    });
    return v;
  },
);

export const selectProductivityHappinessLineChartData = createSelector(
  selectProductivityHappinessLineChartDataComplete,
  (chart: LineChartData, props: { howMany: number }): LineChartData => {
    const f = -1 * props.howMany;
    return {
      labels: chart.labels.slice(f),
      data: [
        { data: (chart.data[0] as any).data.slice(f), label: chart.data[0].label },
        { data: (chart.data[1] as any).data.slice(f), label: chart.data[1].label },
      ],
    };
  },
);
