import {Action} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {Metric, MetricState} from '../metric.model';

export enum MetricActionTypes {
  LoadMetricState = '[Metric] Load Metric State',
  AddMetric = '[Metric] Add Metric',
  UpdateMetric = '[Metric] Update Metric',
  DeleteMetric = '[Metric] Delete Metric',
}

export class LoadMetricState implements Action {
  readonly type = MetricActionTypes.LoadMetricState;

  constructor(public payload: { state: MetricState }) {
  }
}

export class AddMetric implements Action {
  readonly type = MetricActionTypes.AddMetric;

  constructor(public payload: { metric: Metric }) {
  }
}

export class UpdateMetric implements Action {
  readonly type = MetricActionTypes.UpdateMetric;

  constructor(public payload: { metric: Update<Metric> }) {
  }
}

export class DeleteMetric implements Action {
  readonly type = MetricActionTypes.DeleteMetric;

  constructor(public payload: { id: string }) {
  }
}


export type MetricActions =
  LoadMetricState
  | AddMetric
  | UpdateMetric
  | DeleteMetric
  ;
