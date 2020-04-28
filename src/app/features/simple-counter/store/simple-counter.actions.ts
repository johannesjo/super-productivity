import {createAction, props} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {SimpleCounter} from '../simple-counter.model';

export const addSimpleCounter = createAction(
  '[SimpleCounter] Add SimpleCounter',
  props<{ simpleCounter: SimpleCounter }>(),
);

export const updateSimpleCounter = createAction(
  '[SimpleCounter] Update SimpleCounter',
  props<{ simpleCounter: Update<SimpleCounter> }>(),
);

export const upsertSimpleCounter = createAction(
  '[SimpleCounter] Upsert SimpleCounter',
  props<{ simpleCounter: SimpleCounter }>(),
);

export const deleteSimpleCounter = createAction(
  '[SimpleCounter] Delete SimpleCounter',
  props<{ id: string }>(),
);

export const deleteSimpleCounters = createAction(
  '[SimpleCounter] Delete multiple SimpleCounters',
  props<{ ids: string[] }>(),
);
