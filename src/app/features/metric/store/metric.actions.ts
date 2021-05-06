import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Metric } from '../metric.model';

export enum MetricActionTypes {
  'AddMetric' = '[Metric] Add Metric',
  'UpdateMetric' = '[Metric] Update Metric',
  'UpsertMetric' = '[Metric] Upsert Metric',
  'DeleteMetric' = '[Metric] Delete Metric',
}

export class AddMetric implements Action {
  readonly type: string = MetricActionTypes.AddMetric;

  constructor(public payload: { metric: Metric }) {}
}

export class UpdateMetric implements Action {
  readonly type: string = MetricActionTypes.UpdateMetric;

  constructor(public payload: { metric: Update<Metric> }) {}
}

export class UpsertMetric implements Action {
  readonly type: string = MetricActionTypes.UpsertMetric;

  constructor(public payload: { metric: Metric }) {}
}

export class DeleteMetric implements Action {
  readonly type: string = MetricActionTypes.DeleteMetric;

  constructor(public payload: { id: string }) {}
}

export type MetricActions = AddMetric | UpdateMetric | DeleteMetric | UpsertMetric;
