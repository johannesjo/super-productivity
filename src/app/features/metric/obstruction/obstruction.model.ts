import { EntityState } from '@ngrx/entity';

// TODO: Remove in future version - kept for backward compatibility only
// This feature has been removed but types are kept for data migration

export interface Obstruction {
  id: string;
  title: string;
  note?: string;
}

export type ObstructionState = EntityState<Obstruction>;
