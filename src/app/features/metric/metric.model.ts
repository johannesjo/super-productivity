export interface MetricForDayCopy {
  id: string;

  // used as id
  // date: string;
  // obstructions: string[];
  // improvements: string[];
  // improvementsTomorrow: string[];
  // mood?: number;
  // efficiency?: number;
}

export type Metric = Readonly<MetricForDayCopy>;

export interface MetricState extends EntityState<Metric> {
}

import {EntityState} from '@ngrx/entity';
