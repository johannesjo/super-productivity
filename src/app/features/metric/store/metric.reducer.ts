import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import {
  addMetric,
  deleteMetric,
  updateMetric,
  upsertMetric,
  logFocusSession,
} from './metric.actions';
import { Metric, MetricState } from '../metric.model';
import { loadAllData } from '../../../root-store/meta/load-all-data.action';
import { createReducer, on } from '@ngrx/store';
import { DEFAULT_METRIC_FOR_DAY } from '../metric.const';

export const METRIC_FEATURE_NAME = 'metric';
export const metricAdapter: EntityAdapter<Metric> = createEntityAdapter<Metric>();

export const initialMetricState: MetricState = metricAdapter.getInitialState({
  // additional entity state properties
});

export const metricReducer = createReducer<MetricState>(
  initialMetricState,

  on(loadAllData, (state, { appDataComplete }) =>
    appDataComplete.metric?.ids ? appDataComplete.metric : state,
  ),

  on(addMetric, (state, { metric }) => metricAdapter.addOne(metric, state)),

  on(updateMetric, (state, { metric }) => metricAdapter.updateOne(metric, state)),

  on(upsertMetric, (state, { metric }) => metricAdapter.upsertOne(metric, state)),

  on(deleteMetric, (state, { id }) => metricAdapter.removeOne(id, state)),

  on(logFocusSession, (state, { day, duration }) => {
    if (duration <= 0) {
      return state;
    }

    const existing = state.entities[day];
    if (existing) {
      const focusSessions = existing.focusSessions ?? [];
      return metricAdapter.updateOne(
        {
          id: day,
          changes: {
            focusSessions: [...focusSessions, duration],
          },
        },
        state,
      );
    }

    const newMetric: Metric = {
      id: day,
      ...DEFAULT_METRIC_FOR_DAY,
      focusSessions: [duration],
    };
    return metricAdapter.upsertOne(newMetric, state);
  }),
);
