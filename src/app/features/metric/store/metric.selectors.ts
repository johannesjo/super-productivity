import { createFeatureSelector, createSelector } from '@ngrx/store';
import { LineChartData, Metric, MetricState, PieChartData } from '../metric.model';
import { sortWorklogDates } from '../../../util/sortWorklogDates';
import { METRIC_FEATURE_NAME, metricAdapter } from './metric.reducer';
import {
  selectAllImprovementIds,
  selectImprovementFeatureState,
  selectRepeatedImprovementIds
} from '../improvement/store/improvement.reducer';
import { Improvement, ImprovementState } from '../improvement/improvement.model';
import { selectAllObstructionIds, selectObstructionFeatureState } from '../obstruction/store/obstruction.reducer';
import { ObstructionState } from '../obstruction/obstruction.model';
import { unique } from '../../../util/unique';

export const selectMetricFeatureState = createFeatureSelector<MetricState>(METRIC_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = metricAdapter.getSelectors();
export const selectAllMetrics = createSelector(selectMetricFeatureState, selectAll);
export const selectLastTrackedMetric = createSelector(selectMetricFeatureState, (state: MetricState) => {
  const ids = state.ids as string[];
  const sorted = sortWorklogDates(ids);
  const id = sorted[sorted.length - 1];
  return state.entities[id];
});

export const selectMetricHasData = createSelector(selectMetricFeatureState, (state) => state && !!state.ids.length);

export const selectImprovementBannerImprovements = createSelector(
  selectLastTrackedMetric,
  selectImprovementFeatureState,
  selectRepeatedImprovementIds,
  (metric: Metric, improvementState: ImprovementState, repeatedImprovementIds: string[]): Improvement[] => {
    if (!improvementState.ids.length) {
      return null;
    }
    const hiddenIds = improvementState.hiddenImprovementBannerItems || [];

    const selectedTomorrowIds = metric && metric.improvementsTomorrow || [];
    const all = unique(repeatedImprovementIds.concat(selectedTomorrowIds))
      .filter(id => !hiddenIds.includes(id));
    return all.map(id => improvementState.entities[id]);
  });

export const selectHasLastTrackedImprovements = createSelector(
  selectImprovementBannerImprovements,
  (improvements): boolean => !!improvements && improvements.length > 0
);

export const selectAllUsedImprovementIds = createSelector(
  selectAllMetrics,
  (metrics: Metric[]): string[] => {
    return unique(
      metrics.reduce((acc, metric) => [
        ...acc,
        ...metric.improvements,
        ...metric.improvementsTomorrow,
      ], [])
    );
  }
);

export const selectUnusedImprovementIds = createSelector(
  selectAllUsedImprovementIds,
  selectAllImprovementIds,
  (usedIds: string[], allIds: string[]): string[] => {
    return allIds.filter(id => !usedIds.includes(id));
  }
);

export const selectAllUsedObstructionIds = createSelector(
  selectAllMetrics,
  (metrics: Metric[]): string[] => {
    return unique(
      metrics.reduce((acc, metric) => [
        ...acc,
        ...metric.obstructions,
      ], [])
    );
  }
);

export const selectUnusedObstructionIds = createSelector(
  selectAllUsedObstructionIds,
  selectAllObstructionIds,
  (usedIds: string[], allIds: string[]): string[] => {
    return allIds.filter(id => !usedIds.includes(id));
  }
);

// DYNAMIC
// -------
export const selectMetricById = createSelector(
  selectMetricFeatureState,
  (state, props: { id: string }) => state.entities[props.id]
);

// STATISTICS
// ...
export const selectImprovementCountsPieChartData = createSelector(
  selectAllMetrics,
  selectImprovementFeatureState,
  (metrics: Metric[], improvementState: ImprovementState): PieChartData => {
    if (!metrics.length || !improvementState.ids.length) {
      return null;
    }

    const counts = {};
    metrics.forEach((metric: Metric) => {
      metric.improvements.forEach((improvementId: string) => {
        counts[improvementId] = counts[improvementId]
          ? counts[improvementId] + 1
          : 1;
      });
    });
    const chart: PieChartData = {
      labels: [],
      data: [],
    };
    Object.keys(counts).forEach(id => {
      if (improvementState.entities[id]) {
        chart.labels.push(improvementState.entities[id].title);
        chart.data.push(counts[id]);
      } else {
        console.warn('No improvement entity found');
      }
    });
    return chart;
  }
);

export const selectObstructionCountsPieChartData = createSelector(
  selectAllMetrics,
  selectObstructionFeatureState,
  (metrics: Metric[], obstructionState: ObstructionState): PieChartData => {
    if (!metrics.length || !obstructionState.ids.length) {
      return null;
    }

    const counts = {};
    metrics.forEach((metric: Metric) => {
      metric.obstructions.forEach((obstructionId: string) => {
        counts[obstructionId] = counts[obstructionId]
          ? counts[obstructionId] + 1
          : 1;
      });
    });
    const chart: PieChartData = {
      labels: [],
      data: [],
    };
    Object.keys(counts).forEach(id => {
      if (obstructionState.entities[id]) {
        chart.labels.push(obstructionState.entities[id].title);
        chart.data.push(counts[id]);
      } else {
        console.warn('No obstruction entity found');
      }
    });
    return chart;
  }
);

export const selectProductivityHappinessLineChartDataComplete = createSelector(
  selectMetricFeatureState,
  (state: MetricState): LineChartData => {
    const ids = state.ids as string[];
    const sorted = sortWorklogDates(ids);

    const v = {
      labels: [],
      data: [
        {data: [], label: 'Mood'},
        {data: [], label: 'Productivity'},
      ],
    };
    sorted.forEach(id => {
      const metric = state.entities[id];
      v.labels.push(metric.id);
      v.data[0].data.push(metric.mood);
      v.data[1].data.push(metric.productivity);
    });
    return v;
  }
);

export const selectProductivityHappinessLineChartData = createSelector(
  selectProductivityHappinessLineChartDataComplete,
  (chart: LineChartData, props: { howMany: number }): LineChartData => {
    const f = -1 * props.howMany;
    return {
      labels: chart.labels.slice(f),
      data: [
        {data: chart.data[0].data.slice(f), label: chart.data[0].label},
        {data: chart.data[1].data.slice(f), label: chart.data[1].label},
      ],
    };
  }
);
