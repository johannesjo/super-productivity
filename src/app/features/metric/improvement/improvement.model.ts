import {EntityState} from '@ngrx/entity';

export interface ImprovementCopy {
  id: string;
  title: string;
}

export type Improvement = Readonly<ImprovementCopy>;

export interface ImprovementState extends EntityState<Improvement> {
  // additional entities state properties
}
