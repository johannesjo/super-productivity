import {createFeatureSelector, createSelector} from '@ngrx/store';
import {LineChartData, Metric, MetricState, PieChartData} from '../metric.model';
import {sortStringDates} from '../../../util/sortStringDates';
import {METRIC_FEATURE_NAME, metricAdapter} from './metric.reducer';
import {selectImprovementFeatureState} from '../improvement/store/improvement.reducer';
import {ImprovementState} from '../improvement/improvement.model';
import {selectObstructionFeatureState} from '../obstruction/store/obstruction.reducer';
import {ObstructionState} from '../obstruction/obstruction.model';
import {ChartDataSets} from 'chart.js';

export const selectMetricFeatureState = createFeatureSelector<MetricState>(METRIC_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = metricAdapter.getSelectors();
export const selectAllMetrics = createSelector(selectMetricFeatureState, selectAll);
export const selectLastTrackedMetric = createSelector(selectMetricFeatureState, (state: MetricState) => {
  const ids = state.ids as string[];
  const sorted = sortStringDates(ids);
  const id = sorted[sorted.length - 1];
  return state.entities[id];
});

export const selectLastTrackedImprovementsTomorrow = createSelector(
  selectLastTrackedMetric,
  selectImprovementFeatureState,
  (metric: Metric, improvementState: ImprovementState) => {
    if (!metric || !improvementState.ids.length) {
      return null;
    }
    const hiddenIds = improvementState.hiddenImprovementBannerItems || [];

    return metric && metric.improvementsTomorrow
      .filter(id => !hiddenIds.includes(id))
      .map(id => improvementState.entities[id]);
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
      chart.labels.push(improvementState.entities[id].title);
      chart.data.push(counts[id]);
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
      chart.labels.push(obstructionState.entities[id].title);
      chart.data.push(counts[id]);
    });
    return chart;
  }
);

export const selectProductivityHappinessLineChartData = createSelector(
  selectMetricFeatureState,
  (state: MetricState): LineChartData => {
    const ids = state.ids as string[];
    const sorted = sortStringDates(ids);

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
