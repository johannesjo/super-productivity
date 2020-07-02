import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Metric, MetricState } from '../metric.model';

export enum MetricActionTypes {
  LoadMetricState = '[Metric] Load Metric State',
  AddMetric = '[Metric] Add Metric',
  UpdateMetric = '[Metric] Update Metric',
  UpsertMetric = '[Metric] Upsert Metric',
  DeleteMetric = '[Metric] Delete Metric',
}

export class LoadMetricState implements Action {
  readonly type: string = MetricActionTypes.LoadMetricState;

  constructor(public payload: { state: MetricState }) {
  }
}

export class AddMetric implements Action {
  readonly type: string = MetricActionTypes.AddMetric;

  constructor(public payload: { metric: Metric }) {
  }
}

export class UpdateMetric implements Action {
  readonly type: string = MetricActionTypes.UpdateMetric;

  constructor(public payload: { metric: Update<Metric> }) {
  }
}

export class UpsertMetric implements Action {
  readonly type: string = MetricActionTypes.UpsertMetric;

  constructor(public payload: { metric: Metric }) {
  }
}

export class DeleteMetric implements Action {
  readonly type: string = MetricActionTypes.DeleteMetric;

  constructor(public payload: { id: string }) {
  }
}

export type MetricActions =
  LoadMetricState
  | AddMetric
  | UpdateMetric
  | DeleteMetric
  | UpsertMetric
  ;
