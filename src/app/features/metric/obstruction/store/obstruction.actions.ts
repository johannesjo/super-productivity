import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
import { Obstruction } from '../obstruction.model';

enum ObstructionActionTypes {
  'AddObstruction' = '[Obstruction] Add Obstruction',
  'UpdateObstruction' = '[Obstruction] Update Obstruction',
  'DeleteObstruction' = '[Obstruction] Delete Obstruction',
  'DeleteObstructions' = '[Obstruction] Delete multiple Obstructions',
}

export const addObstruction = createAction(
  ObstructionActionTypes.AddObstruction,
  props<{ obstruction: Obstruction }>(),
);

export const updateObstruction = createAction(
  ObstructionActionTypes.UpdateObstruction,
  props<{ obstruction: Update<Obstruction> }>(),
);

export const deleteObstruction = createAction(
  ObstructionActionTypes.DeleteObstruction,
  props<{ id: string }>(),
);

export const deleteObstructions = createAction(
  ObstructionActionTypes.DeleteObstructions,
  props<{ ids: string[] }>(),
);
