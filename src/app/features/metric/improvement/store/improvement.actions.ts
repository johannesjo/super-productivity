import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Improvement } from '../improvement.model';

enum ImprovementActionTypes {
  'AddImprovement' = '[Improvement] Add Improvement',
  'UpdateImprovement' = '[Improvement] Update Improvement',
  'DeleteImprovement' = '[Improvement] Delete Improvement',
  'DeleteImprovements' = '[Improvement] Delete multiple Improvements',
  'HideImprovement' = '[Improvement] Hide Improvement',
  'ToggleImprovementRepeat' = '[Improvement] Toggle Improvement Repeat',
  'DisableImprovementRepeat' = '[Improvement] Disable Improvement Repeat',
  'ClearHiddenImprovements' = '[Improvement] Clear Hidden Improvements',
  'AddImprovementCheckedDay' = '[Improvement] Add checked day',
}

export const addImprovement = createAction(
  ImprovementActionTypes.AddImprovement,
  props<{ improvement: Improvement }>(),
);

export const updateImprovement = createAction(
  ImprovementActionTypes.UpdateImprovement,
  props<{ improvement: Update<Improvement> }>(),
);

export const deleteImprovement = createAction(
  ImprovementActionTypes.DeleteImprovement,
  props<{ id: string }>(),
);

export const deleteImprovements = createAction(
  ImprovementActionTypes.DeleteImprovements,
  props<{ ids: string[] }>(),
);

export const hideImprovement = createAction(
  ImprovementActionTypes.HideImprovement,
  props<{ id: string }>(),
);

export const addImprovementCheckedDay = createAction(
  ImprovementActionTypes.AddImprovementCheckedDay,
  props<{ id: string; checkedDay: string }>(),
);

export const toggleImprovementRepeat = createAction(
  ImprovementActionTypes.ToggleImprovementRepeat,
  props<{ id: string }>(),
);

export const disableImprovementRepeat = createAction(
  ImprovementActionTypes.DisableImprovementRepeat,
  props<{ id: string }>(),
);

export const clearHiddenImprovements = createAction(
  ImprovementActionTypes.ClearHiddenImprovements,
);
