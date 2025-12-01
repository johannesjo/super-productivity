import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { createFeatureSelector, createReducer } from '@ngrx/store';
import { Obstruction, ObstructionState } from '../obstruction.model';

// TODO: Remove in future version - kept for backward compatibility only
// This feature has been removed but reducer is kept for data migration

export const OBSTRUCTION_FEATURE_NAME = 'obstruction';

export const obstructionAdapter: EntityAdapter<Obstruction> =
  createEntityAdapter<Obstruction>();

export const initialObstructionState: ObstructionState =
  obstructionAdapter.getInitialState();

// Empty reducer that maintains empty state for backward compatibility
export const obstructionReducer = createReducer(initialObstructionState);

// Stub selector for backward compatibility
export const selectObstructionFeatureState = createFeatureSelector<ObstructionState>(
  OBSTRUCTION_FEATURE_NAME,
);
