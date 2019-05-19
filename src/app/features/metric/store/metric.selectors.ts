import {createFeatureSelector, createSelector} from '@ngrx/store';
import {MetricState} from '../metric.model';
import {sortStringDates} from '../../../util/sortStringDates';
import {METRIC_FEATURE_NAME, metricAdapter} from './metric.reducer';

export const selectMetricFeatureState = createFeatureSelector<MetricState>(METRIC_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = metricAdapter.getSelectors();
export const selectAllMetrics = createSelector(selectMetricFeatureState, selectAll);
export const selectLastTrackedMetric = createSelector(selectMetricFeatureState, (state: MetricState) => {
  const ids = state.ids as string[];
  const sorted = sortStringDates(ids);
  const id = sorted[sorted.length - 1];
  return state.entities[id];
});

// DYNAMIC
// -------
export const selectMetricById = createSelector(
  selectMetricFeatureState,
  (state, props: { id: string }) => state.entities[props.id]
);


// STATISTICS
// ...
