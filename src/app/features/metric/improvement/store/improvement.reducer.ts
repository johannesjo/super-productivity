import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { Improvement, ImprovementState } from '../improvement.model';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';

// TODO: Remove in future version - kept for backward compatibility only
// This feature has been removed but reducer is kept for data migration

export const IMPROVEMENT_FEATURE_NAME = 'improvement';

export const improvementAdapter: EntityAdapter<Improvement> =
  createEntityAdapter<Improvement>();

export const initialImprovementState: ImprovementState =
  improvementAdapter.getInitialState({
    hiddenImprovementBannerItems: [],
  });

// Reducer that loads state from appDataComplete for backward compatibility
export const improvementReducer = createReducer(
  initialImprovementState,
  on(loadAllData, (state, { appDataComplete }) =>
    appDataComplete.improvement?.ids ? appDataComplete.improvement : state,
  ),
);

// Stub selectors for backward compatibility
export const selectImprovementFeatureState = createFeatureSelector<ImprovementState>(
  IMPROVEMENT_FEATURE_NAME,
);

export const selectRepeatedImprovementIds = createSelector(
  selectImprovementFeatureState,
  (): string[] => [],
);

export const selectCheckedImprovementIdsForDay = createSelector(
  selectImprovementFeatureState,
  (): string[] => [],
);
