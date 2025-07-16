import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import {
  addObstruction,
  deleteObstructions,
  updateObstruction,
} from './obstruction.actions';
import { Obstruction, ObstructionState } from '../obstruction.model';
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';

export const OBSTRUCTION_FEATURE_NAME = 'obstruction';

export const obstructionAdapter: EntityAdapter<Obstruction> =
  createEntityAdapter<Obstruction>();
export const selectObstructionFeatureState = createFeatureSelector<ObstructionState>(
  OBSTRUCTION_FEATURE_NAME,
);
export const { selectIds, selectEntities, selectAll, selectTotal } =
  obstructionAdapter.getSelectors();
export const selectAllObstructions = createSelector(
  selectObstructionFeatureState,
  selectAll,
);
export const selectAllObstructionIds = createSelector(
  selectObstructionFeatureState,
  selectIds,
);

export const initialObstructionState: ObstructionState =
  obstructionAdapter.getInitialState({
    // additional entity state properties
  });

export const obstructionReducer = createReducer<ObstructionState>(
  initialObstructionState,

  on(loadAllData, (state, { appDataComplete }) =>
    appDataComplete.obstruction?.ids ? appDataComplete.obstruction : state,
  ),

  on(addObstruction, (state, { obstruction }) =>
    obstructionAdapter.addOne(obstruction, state),
  ),

  on(updateObstruction, (state, { obstruction }) =>
    obstructionAdapter.updateOne(obstruction, state),
  ),

  on(deleteObstructions, (state, { ids }) => obstructionAdapter.removeMany(ids, state)),
);
