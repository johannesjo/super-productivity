import { createAction, props } from '@ngrx/store';
import { AppDataComplete } from '../../imex/sync/sync.model';

export const loadAllData = createAction(
  '[SP_ALL] Load(import) all data',
  props<{ appDataComplete: AppDataComplete; isOmitTokens: boolean }>(),
);
