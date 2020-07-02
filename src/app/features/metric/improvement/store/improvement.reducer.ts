import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { ImprovementActions, ImprovementActionTypes } from './improvement.actions';
import { Improvement, ImprovementState } from '../improvement.model';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { getWorklogStr } from '../../../../util/get-work-log-str';

export const IMPROVEMENT_FEATURE_NAME = 'improvement';

export const adapter: EntityAdapter<Improvement> = createEntityAdapter<Improvement>();
export const selectImprovementFeatureState = createFeatureSelector<ImprovementState>(IMPROVEMENT_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAllImprovements = createSelector(selectImprovementFeatureState, selectAll);
export const selectAllImprovementIds = createSelector(selectImprovementFeatureState, selectIds);
export const selectImprovementHideDay = createSelector(selectImprovementFeatureState, (s) => s.hideDay);

export const selectRepeatedImprovementIds = createSelector(
  selectAllImprovements,
  (improvements: Improvement[]): string[] => {
    return improvements && improvements.filter(i => i.isRepeat).map(i => i.id);
  }
);

export const selectCheckedImprovementIdsForDay = createSelector(
  selectAllImprovements,
  (improvements: Improvement[], props: { day: string }): string[] => {
    return improvements.filter(improvement => improvement.checkedDays && improvement.checkedDays.includes(props.day))
      .map(improvement => improvement.id);
  });

export const initialImprovementState: ImprovementState = adapter.getInitialState({
  // additional entity state properties
  hideDay: null,
  hiddenImprovementBannerItems: [],
});

export function improvementReducer(
  state = initialImprovementState,
  action: ImprovementActions
): ImprovementState {
  switch (action.type) {
    case ImprovementActionTypes.AddImprovement: {
      return adapter.addOne(action.payload.improvement, state);
    }

    case ImprovementActionTypes.UpdateImprovement: {
      return adapter.updateOne(action.payload.improvement, state);
    }

    case ImprovementActionTypes.DeleteImprovement: {
      return adapter.removeOne(action.payload.id, state);
    }

    // case ImprovementActionTypes.DeleteImprovements: {
    //   return adapter.removeMany(action.payload.ids, state);
    // }

    case ImprovementActionTypes.LoadImprovementState:
      return {...action.payload.state};

    case ImprovementActionTypes.HideImprovement:
      const items = state.hiddenImprovementBannerItems || [];
      return {
        ...state,
        hideDay: getWorklogStr(),
        hiddenImprovementBannerItems: [...items, action.payload.id]
      };

    case ImprovementActionTypes.ToggleImprovementRepeat:
      const itemI = state.entities[action.payload.id];
      return adapter.updateOne({
        id: action.payload.id,
        changes: {
          isRepeat: !itemI.isRepeat
        },
      }, state);

    case ImprovementActionTypes.DisableImprovementRepeat:
      return adapter.updateOne({
        id: action.payload.id,
        changes: {
          isRepeat: false
        },
      }, state);

    case ImprovementActionTypes.ClearHiddenImprovements:
      return {
        ...state,
        hiddenImprovementBannerItems: []
      };

    case ImprovementActionTypes.AddImprovementCheckedDay: {
      const {id, checkedDay} = action.payload;
      const allCheckedDays = state.entities[id].checkedDays || [];

      return (allCheckedDays.includes(checkedDay) && checkedDay)
        ? state
        : adapter.updateOne({
          id,
          changes: {
            checkedDays: [...allCheckedDays, checkedDay]
          }
        }, state);

    }

    default: {
      return state;
    }
  }
}


