import { createAction, props } from '@ngrx/store';
import { AppDataCompleteLegacy, AppDataCompleteNew } from '../../imex/sync/sync.model';

export const loadAllData = createAction(
  '[SP_ALL] Load(import) all data',
  props<{
    appDataComplete: AppDataCompleteLegacy | AppDataCompleteNew;
    isOmitTokens: boolean;
  }>(),
);
