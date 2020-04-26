import {createAction, props} from '@ngrx/store';
import {AppDataComplete} from '../../imex/sync/sync.model';

export const loadDataComplete = createAction(
  '[SP_ALL] Import data',
  props<{ appDataComplete: AppDataComplete }>(),
);
