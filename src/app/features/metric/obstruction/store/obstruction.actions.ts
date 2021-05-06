import { Action } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Obstruction } from '../obstruction.model';

export enum ObstructionActionTypes {
  'AddObstruction' = '[Obstruction] Add Obstruction',
  'UpdateObstruction' = '[Obstruction] Update Obstruction',
  'DeleteObstruction' = '[Obstruction] Delete Obstruction',
  'DeleteObstructions' = '[Obstruction] Delete multiple Obstructions',
}

export class AddObstruction implements Action {
  readonly type: string = ObstructionActionTypes.AddObstruction;

  constructor(public payload: { obstruction: Obstruction }) {}
}

export class UpdateObstruction implements Action {
  readonly type: string = ObstructionActionTypes.UpdateObstruction;

  constructor(public payload: { obstruction: Update<Obstruction> }) {}
}

export class DeleteObstruction implements Action {
  readonly type: string = ObstructionActionTypes.DeleteObstruction;

  constructor(public payload: { id: string }) {}
}

export class DeleteObstructions implements Action {
  readonly type: string = ObstructionActionTypes.DeleteObstructions;

  constructor(public payload: { ids: string[] }) {}
}

export type ObstructionActions =
  | AddObstruction
  | UpdateObstruction
  | DeleteObstruction
  | DeleteObstructions;
