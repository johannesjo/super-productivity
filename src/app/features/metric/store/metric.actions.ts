import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Metric } from '../metric.model';

enum MetricActionTypes {
  'AddMetric' = '[Metric] Add Metric',
  'UpdateMetric' = '[Metric] Update Metric',
  'UpsertMetric' = '[Metric] Upsert Metric',
  'DeleteMetric' = '[Metric] Delete Metric',
  'LogFocusSession' = '[Metric] Log Focus Session',
}

export const addMetric = createAction(
  MetricActionTypes.AddMetric,
  props<{ metric: Metric }>(),
);

export const updateMetric = createAction(
  MetricActionTypes.UpdateMetric,
  props<{ metric: Update<Metric> }>(),
);

export const upsertMetric = createAction(
  MetricActionTypes.UpsertMetric,
  props<{ metric: Metric }>(),
);

export const deleteMetric = createAction(
  MetricActionTypes.DeleteMetric,
  props<{ id: string }>(),
);

export const logFocusSession = createAction(
  MetricActionTypes.LogFocusSession,
  props<{ day: string; duration: number }>(),
);
