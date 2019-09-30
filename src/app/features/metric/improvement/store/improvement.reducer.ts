import {createEntityAdapter, EntityAdapter} from '@ngrx/entity';
import {ImprovementActions, ImprovementActionTypes} from './improvement.actions';
import {Improvement, ImprovementState} from '../improvement.model';
import {createFeatureSelector, createSelector} from '@ngrx/store';

export const IMPROVEMENT_FEATURE_NAME = 'improvement';


export const adapter: EntityAdapter<Improvement> = createEntityAdapter<Improvement>();
export const selectImprovementFeatureState = createFeatureSelector<ImprovementState>(IMPROVEMENT_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAllImprovements = createSelector(selectImprovementFeatureState, selectAll);
export const selectAllImprovementIds = createSelector(selectImprovementFeatureState, selectIds);


export const initialImprovementState: ImprovementState = adapter.getInitialState({
  // additional entity state properties
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

    case ImprovementActionTypes.DeleteImprovements: {
      return adapter.removeMany(action.payload.ids, state);
    }

    case ImprovementActionTypes.LoadImprovementState:
      return {...action.payload.state};

    case ImprovementActionTypes.HideImprovement:
      const items = state.hiddenImprovementBannerItems || [];
      return {
        ...state,
        hiddenImprovementBannerItems: [...items, action.payload.id]
      };

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


