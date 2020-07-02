import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import {
  AddMetric,
  DeleteMetric,
  LoadMetricState,
  MetricActions,
  MetricActionTypes,
  UpdateMetric,
  UpsertMetric
} from './metric.actions';
import { Metric, MetricState } from '../metric.model';

export const METRIC_FEATURE_NAME = 'metric';
export const metricAdapter: EntityAdapter<Metric> = createEntityAdapter<Metric>();

export const initialMetricState: MetricState = metricAdapter.getInitialState({
  // additional entity state properties
});

export function metricReducer(
  state: MetricState = initialMetricState,
  action: MetricActions
): MetricState {

  switch (action.type) {
    case MetricActionTypes.AddMetric: {
      return metricAdapter.addOne((action as AddMetric).payload.metric, state);
    }

    case MetricActionTypes.UpdateMetric: {
      return metricAdapter.updateOne((action as UpdateMetric).payload.metric, state);
    }

    case MetricActionTypes.UpsertMetric: {
      return metricAdapter.upsertOne((action as UpsertMetric).payload.metric, state);
    }

    case MetricActionTypes.DeleteMetric: {
      return metricAdapter.removeOne((action as DeleteMetric).payload.id, state);
    }

    case MetricActionTypes.LoadMetricState:
      return {...(action as LoadMetricState).payload.state};

    default: {
      return state;
    }
  }
}


