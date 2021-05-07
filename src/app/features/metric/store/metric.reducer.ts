import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import {
  AddMetric,
  DeleteMetric,
  MetricActions,
  MetricActionTypes,
  UpdateMetric,
  UpsertMetric,
} from './metric.actions';
import { Metric, MetricState } from '../metric.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { AppDataComplete } from '../../../imex/sync/sync.model';
import { migrateMetricState } from '../migrate-metric-states.util';

export const METRIC_FEATURE_NAME = 'metric';
export const metricAdapter: EntityAdapter<Metric> = createEntityAdapter<Metric>();

export const initialMetricState: MetricState = metricAdapter.getInitialState({
  // additional entity state properties
});

export const metricReducer = (
  state: MetricState = initialMetricState,
  action: MetricActions,
): MetricState => {
  // TODO fix this hackyness once we use the new syntax everywhere
  if ((action.type as string) === loadAllData.type) {
    const { appDataComplete }: { appDataComplete: AppDataComplete } = action as any;
    return appDataComplete.metric?.ids
      ? appDataComplete.metric
      : migrateMetricState(state);
  }

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

    default: {
      return state;
    }
  }
};
