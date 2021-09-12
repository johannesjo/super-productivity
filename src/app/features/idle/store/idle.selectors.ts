import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromIdle from './idle.reducer';

export const selectIdleState = createFeatureSelector<fromIdle.IdleState>(
  fromIdle.IDLE_FEATURE_KEY,
);

export const selectIsIdle = createSelector(
  selectIdleState,
  (state): boolean => state.isIdle,
);

export const selectIdleTime = createSelector(
  selectIdleState,
  (state): number => state.idleTime,
);
