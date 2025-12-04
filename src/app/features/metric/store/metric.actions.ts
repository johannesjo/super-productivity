import { createAction } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Metric } from '../metric.model';
import { PersistentActionMeta } from '../../../core/persistence/operation-log/persistent-action.interface';
import { OpType } from '../../../core/persistence/operation-log/operation.types';

enum MetricActionTypes {
  'AddMetric' = '[Metric] Add Metric',
  'UpdateMetric' = '[Metric] Update Metric',
  'UpsertMetric' = '[Metric] Upsert Metric',
  'DeleteMetric' = '[Metric] Delete Metric',
  'LogFocusSession' = '[Metric] Log Focus Session',
}

export const addMetric = createAction(
  MetricActionTypes.AddMetric,
  (metricProps: { metric: Metric }) => ({
    ...metricProps,
    meta: {
      isPersistent: true,
      entityType: 'METRIC',
      entityId: metricProps.metric.id,
      opType: OpType.Create,
    } satisfies PersistentActionMeta,
  }),
);

export const updateMetric = createAction(
  MetricActionTypes.UpdateMetric,
  (metricProps: { metric: Update<Metric> }) => ({
    ...metricProps,
    meta: {
      isPersistent: true,
      entityType: 'METRIC',
      entityId: metricProps.metric.id as string,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const upsertMetric = createAction(
  MetricActionTypes.UpsertMetric,
  (metricProps: { metric: Metric }) => ({
    ...metricProps,
    meta: {
      isPersistent: true,
      entityType: 'METRIC',
      entityId: metricProps.metric.id,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);

export const deleteMetric = createAction(
  MetricActionTypes.DeleteMetric,
  (metricProps: { id: string }) => ({
    ...metricProps,
    meta: {
      isPersistent: true,
      entityType: 'METRIC',
      entityId: metricProps.id,
      opType: OpType.Delete,
    } satisfies PersistentActionMeta,
  }),
);

export const logFocusSession = createAction(
  MetricActionTypes.LogFocusSession,
  (metricProps: { day: string; duration: number }) => ({
    ...metricProps,
    meta: {
      isPersistent: true,
      entityType: 'METRIC',
      entityId: metricProps.day,
      opType: OpType.Update,
    } satisfies PersistentActionMeta,
  }),
);
