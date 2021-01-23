import { EntityState } from '@ngrx/entity';

export interface ObstructionCopy {
  id: string;
  title: string;
}

export type Obstruction = Readonly<ObstructionCopy>;

export type ObstructionState = EntityState<Obstruction>;
