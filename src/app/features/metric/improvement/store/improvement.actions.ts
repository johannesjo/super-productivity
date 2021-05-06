import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Improvement } from '../improvement.model';

export enum ImprovementActionTypes {
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

export class AddImprovement implements Action {
  readonly type: string = ImprovementActionTypes.AddImprovement;

  constructor(public payload: { improvement: Improvement }) {}
}

export class UpdateImprovement implements Action {
  readonly type: string = ImprovementActionTypes.UpdateImprovement;

  constructor(public payload: { improvement: Update<Improvement> }) {}
}

export class DeleteImprovement implements Action {
  readonly type: string = ImprovementActionTypes.DeleteImprovement;

  constructor(public payload: { id: string }) {}
}

export class DeleteImprovements implements Action {
  readonly type: string = ImprovementActionTypes.DeleteImprovements;

  constructor(public payload: { ids: string[] }) {}
}

export class HideImprovement implements Action {
  readonly type: string = ImprovementActionTypes.HideImprovement;

  constructor(public payload: { id: string }) {}
}

export class AddImprovementCheckedDay implements Action {
  readonly type: string = ImprovementActionTypes.AddImprovementCheckedDay;

  constructor(public payload: { id: string; checkedDay: string }) {}
}

export class ToggleImprovementRepeat implements Action {
  readonly type: string = ImprovementActionTypes.ToggleImprovementRepeat;

  constructor(public payload: { id: string }) {}
}

export class DisableImprovementRepeat implements Action {
  readonly type: string = ImprovementActionTypes.DisableImprovementRepeat;

  constructor(public payload: { id: string }) {}
}

export class ClearHiddenImprovements implements Action {
  readonly type: string = ImprovementActionTypes.ClearHiddenImprovements;
}

export type ImprovementActions =
  | AddImprovement
  | UpdateImprovement
  | DeleteImprovement
  | DeleteImprovements
  | HideImprovement
  | ToggleImprovementRepeat
  | DisableImprovementRepeat
  | AddImprovementCheckedDay
  | ClearHiddenImprovements;
