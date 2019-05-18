import {EntityState} from '@ngrx/entity';

export interface ImprovementCopy {
  id: string;
}

export type Improvement = Readonly<ImprovementCopy>;

export interface ImprovementState extends EntityState<Improvement> {
  // additional entities state properties
}
