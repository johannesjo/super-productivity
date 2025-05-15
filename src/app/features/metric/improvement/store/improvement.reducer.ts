import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import {
  addImprovement,
  addImprovementCheckedDay,
  clearHiddenImprovements,
  deleteImprovement,
  deleteImprovements,
  disableImprovementRepeat,
  hideImprovement,
  toggleImprovementRepeat,
  updateImprovement,
} from './improvement.actions';
import { Improvement, ImprovementState } from '../improvement.model';
import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';
import { migrateImprovementState } from '../../migrate-metric-states.util';

export const IMPROVEMENT_FEATURE_NAME = 'improvement';

export const adapter: EntityAdapter<Improvement> = createEntityAdapter<Improvement>();
export const selectImprovementFeatureState = createFeatureSelector<ImprovementState>(
  IMPROVEMENT_FEATURE_NAME,
);
export const { selectIds, selectEntities, selectAll, selectTotal } =
  adapter.getSelectors();
export const selectAllImprovements = createSelector(
  selectImprovementFeatureState,
  selectAll,
);
export const selectAllImprovementIds = createSelector(
  selectImprovementFeatureState,
  selectIds,
);
export const selectImprovementHideDay = createSelector(
  selectImprovementFeatureState,
  (s) => s.hideDay,
);
export const selectHiddenImprovements = createSelector(
  selectImprovementFeatureState,
  (s) => s.hiddenImprovementBannerItems,
);

export const selectRepeatedImprovementIds = createSelector(
  selectAllImprovements,
  (improvements: Improvement[]): string[] => {
    return improvements && improvements.filter((i) => i.isRepeat).map((i) => i.id);
  },
);

export const selectCheckedImprovementIdsForDay = createSelector(
  selectAllImprovements,
  (improvements: Improvement[], props: { day: string }): string[] => {
    return improvements
      .filter(
        (improvement) =>
          improvement.checkedDays && improvement.checkedDays.includes(props.day),
      )
      .map((improvement) => improvement.id);
  },
);

export const initialImprovementState: ImprovementState = adapter.getInitialState({
  // additional entity state properties
  hideDay: null,
  hiddenImprovementBannerItems: [],
});

export const improvementReducer = createReducer<ImprovementState>(
  initialImprovementState,

  on(loadAllData, (state, { appDataComplete }) =>
    appDataComplete.improvement?.ids
      ? appDataComplete.improvement
      : migrateImprovementState(state),
  ),

  on(addImprovement, (state, { improvement }) => {
    return adapter.addOne(improvement, state);
  }),

  on(updateImprovement, (state, { improvement }) => {
    return adapter.updateOne(improvement, state);
  }),

  on(deleteImprovement, (state, { id }) => {
    return adapter.removeOne(id, state);
  }),

  on(deleteImprovements, (state, { ids }) => {
    return adapter.removeMany(ids, state);
  }),

  on(hideImprovement, (state, { id, day }) => {
    const items = state.hiddenImprovementBannerItems || [];
    return {
      ...state,
      hideDay: day,
      hiddenImprovementBannerItems: [...items, id],
    };
  }),
  on(toggleImprovementRepeat, (state, { id }) => {
    const itemI = state.entities[id];
    return adapter.updateOne(
      {
        id,
        changes: {
          isRepeat: !(itemI as Improvement).isRepeat,
        },
      },
      state,
    );
  }),

  on(disableImprovementRepeat, (state, { id }) => {
    return adapter.updateOne(
      {
        id,
        changes: {
          isRepeat: false,
        },
      },
      state,
    );
  }),

  on(clearHiddenImprovements, (state) => {
    if (state.hiddenImprovementBannerItems.length === 0) {
      return state;
    }
    return {
      ...state,
      hiddenImprovementBannerItems: [],
    };
  }),

  on(addImprovementCheckedDay, (state, { id, checkedDay }) => {
    const allCheckedDays = (state.entities[id] as Improvement).checkedDays || [];
    return allCheckedDays.includes(checkedDay) && checkedDay
      ? state
      : adapter.updateOne(
          {
            id,
            changes: {
              checkedDays: [...allCheckedDays, checkedDay],
            },
          },
          state,
        );
  }),
);
