import {EntityState} from '@ngrx/entity';

export interface ObstructionCopy {
  id: string;
}

export type Obstruction = Readonly<ObstructionCopy>;

export interface ObstructionState extends EntityState<Obstruction> {
  // additional entities state properties
}
