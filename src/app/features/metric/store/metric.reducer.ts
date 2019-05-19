import {createEntityAdapter, EntityAdapter} from '@ngrx/entity';
import {MetricActions, MetricActionTypes} from './metric.actions';
import {Metric, MetricState} from '../metric.model';

export const METRIC_FEATURE_NAME = 'metric';
export const metricAdapter: EntityAdapter<Metric> = createEntityAdapter<Metric>();

export const initialMetricState: MetricState = metricAdapter.getInitialState({
  // additional entity state properties
});

export function metricReducer(
  state = initialMetricState,
  action: MetricActions
): MetricState {

  switch (action.type) {
    case MetricActionTypes.AddMetric: {
      return metricAdapter.addOne(action.payload.metric, state);
    }

    case MetricActionTypes.UpdateMetric: {
      return metricAdapter.updateOne(action.payload.metric, state);
    }

    case MetricActionTypes.UpsertMetric: {
      return metricAdapter.upsertOne(action.payload.metric, state);
    }

    case MetricActionTypes.DeleteMetric: {
      return metricAdapter.removeOne(action.payload.id, state);
    }

    case MetricActionTypes.LoadMetricState:
      return {...action.payload.state};

    default: {
      return state;
    }
  }
}


