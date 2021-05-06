import { createAction, props } from '@ngrx/store';

// log only
export const saveToDb = createAction(
  '[Persistence] Save to DB',
  props<{ dbKey: string; data: any }>(),
);
export const removeFromDb = createAction(
  '[Persistence] Remove from DB',
  props<{ dbKey: string }>(),
);
export const loadFromDb = createAction(
  '[Persistence] Load from DB',
  props<{ dbKey: string }>(),
);
