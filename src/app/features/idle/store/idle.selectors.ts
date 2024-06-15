import { createFeatureSelector, createSelector } from '@ngrx/store';
import { IDLE_FEATURE_KEY, IdleState } from './idle.reducer';

export const selectIdleState = createFeatureSelector<IdleState>(IDLE_FEATURE_KEY);

export const selectIsIdle = createSelector(
  selectIdleState,
  (state): boolean => state.isIdle,
);

export const selectIdleTime = createSelector(
  selectIdleState,
  (state): number => state.idleTime,
);
