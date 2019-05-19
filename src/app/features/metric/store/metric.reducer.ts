import {createEntityAdapter, EntityAdapter} from '@ngrx/entity';
import {MetricActions, MetricActionTypes} from './metric.actions';
import {Metric, MetricState} from '../metric.model';
import {createFeatureSelector, createSelector} from '@ngrx/store';
import {sortStringDates} from '../../../util/sortStringDates';
import {selectImprovementFeatureState} from '../improvement/store/improvement.reducer';
import {ImprovementState} from '../improvement/improvement.model';

export const METRIC_FEATURE_NAME = 'metric';


export const adapter: EntityAdapter<Metric> = createEntityAdapter<Metric>();
export const selectMetricFeatureState = createFeatureSelector<MetricState>(METRIC_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
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
    return metric && metric.improvementsTomorrow.map(id => improvementState.entities[id]);
  }
);

export const selectMetricById = createSelector(
  selectMetricFeatureState,
  (state, props: { id: string }) => state.entities[props.id]
);


export const initialMetricState: MetricState = adapter.getInitialState({
  // additional entity state properties
});

export function metricReducer(
  state = initialMetricState,
  action: MetricActions
): MetricState {

  switch (action.type) {
    case MetricActionTypes.AddMetric: {
      return adapter.addOne(action.payload.metric, state);
    }

    case MetricActionTypes.UpdateMetric: {
      return adapter.updateOne(action.payload.metric, state);
    }

    case MetricActionTypes.UpsertMetric: {
      return adapter.upsertOne(action.payload.metric, state);
    }

    case MetricActionTypes.DeleteMetric: {
      return adapter.removeOne(action.payload.id, state);
    }

    case MetricActionTypes.LoadMetricState:
      return {...action.payload.state};

    default: {
      return state;
    }
  }
}


