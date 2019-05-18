import {createEntityAdapter, EntityAdapter} from '@ngrx/entity';
import {MetricActions, MetricActionTypes} from './metric.actions';
import {Metric, MetricState} from '../metric.model';
import {createFeatureSelector, createSelector} from '@ngrx/store';

export const METRIC_FEATURE_NAME = 'metric';


export const adapter: EntityAdapter<Metric> = createEntityAdapter<Metric>();
export const selectMetricFeatureState = createFeatureSelector<MetricState>(METRIC_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAllMetrics = createSelector(selectMetricFeatureState, selectAll);

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


