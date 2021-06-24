import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import {
  AddImprovement,
  AddImprovementCheckedDay,
  DeleteImprovement,
  DisableImprovementRepeat,
  HideImprovement,
  ImprovementActions,
  ImprovementActionTypes,
  ToggleImprovementRepeat,
  UpdateImprovement,
} from './improvement.actions';
import { Improvement, ImprovementState } from '../improvement.model';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { getWorklogStr } from '../../../../util/get-work-log-str';
import { loadAllData } from '../../../../root-store/meta/load-all-data.action';
import { AppDataComplete } from '../../../../imex/sync/sync.model';
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

export const improvementReducer = (
  state: ImprovementState = initialImprovementState,
  action: ImprovementActions,
): ImprovementState => {
  // TODO fix this hackyness once we use the new syntax everywhere
  if ((action.type as string) === loadAllData.type) {
    const { appDataComplete }: { appDataComplete: AppDataComplete } = action as any;
    return appDataComplete.improvement?.ids
      ? appDataComplete.improvement
      : migrateImprovementState(state);
  }

  switch (action.type) {
    case ImprovementActionTypes.AddImprovement: {
      return adapter.addOne((action as AddImprovement).payload.improvement, state);
    }

    case ImprovementActionTypes.UpdateImprovement: {
      return adapter.updateOne((action as UpdateImprovement).payload.improvement, state);
    }

    case ImprovementActionTypes.DeleteImprovement: {
      return adapter.removeOne((action as DeleteImprovement).payload.id, state);
    }

    // case ImprovementActionTypes.DeleteImprovements: {
    //   return adapter.removeMany((action as AddImprovement).payload.ids, state);
    // }

    case ImprovementActionTypes.HideImprovement:
      const items = state.hiddenImprovementBannerItems || [];
      return {
        ...state,
        hideDay: getWorklogStr(),
        hiddenImprovementBannerItems: [...items, (action as HideImprovement).payload.id],
      };

    case ImprovementActionTypes.ToggleImprovementRepeat:
      const itemI = state.entities[(action as ToggleImprovementRepeat).payload.id];
      return adapter.updateOne(
        {
          id: (action as ToggleImprovementRepeat).payload.id,
          changes: {
            isRepeat: !(itemI as Improvement).isRepeat,
          },
        },
        state,
      );

    case ImprovementActionTypes.DisableImprovementRepeat:
      return adapter.updateOne(
        {
          id: (action as DisableImprovementRepeat).payload.id,
          changes: {
            isRepeat: false,
          },
        },
        state,
      );

    case ImprovementActionTypes.ClearHiddenImprovements:
      return {
        ...state,
        hiddenImprovementBannerItems: [],
      };

    case ImprovementActionTypes.AddImprovementCheckedDay: {
      const { id, checkedDay } = (action as AddImprovementCheckedDay).payload;
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
    }

    default: {
      return state;
    }
  }
};
