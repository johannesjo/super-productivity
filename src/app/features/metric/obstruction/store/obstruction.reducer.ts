import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { createFeatureSelector, createReducer, on } from '@ngrx/store';
import { Obstruction, ObstructionState } from '../obstruction.model';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';

// TODO: Remove in future version - kept for backward compatibility only
// This feature has been removed but reducer is kept for data migration

export const OBSTRUCTION_FEATURE_NAME = 'obstruction';

export const obstructionAdapter: EntityAdapter<Obstruction> =
  createEntityAdapter<Obstruction>();

export const initialObstructionState: ObstructionState =
  obstructionAdapter.getInitialState();

// Reducer that loads state from appDataComplete for backward compatibility
export const obstructionReducer = createReducer(
  initialObstructionState,
  on(loadAllData, (state, { appDataComplete }) =>
    appDataComplete.obstruction?.ids ? appDataComplete.obstruction : state,
  ),
);

// Stub selector for backward compatibility
export const selectObstructionFeatureState = createFeatureSelector<ObstructionState>(
  OBSTRUCTION_FEATURE_NAME,
);
